import { AppError } from "../../classes/appError";
import QueryBuilder from "../../classes/queryBuilder";
import AuthModel from "../auth/auth.model";
import RiderModel from "../rider/rider.model";
import UserModel from "../user/user.model";
import VendorModel from "../vendor/vendor.model";
import { ChatMessageModel, ConversationModel } from "./chat.model";

type ChatRole = "user" | "vendor" | "rider";

type ChatParticipant = {
  auth: any;
  profile: any;
  role: ChatRole;
  email: string;
  name: string | null;
  image: string | null;
};

const allowedChatRoles: ChatRole[] = ["user", "vendor", "rider"];

const getConversationKey = (authIdA: string, authIdB: string) =>
  [authIdA, authIdB].sort().join(":");

const getParticipantByEmailAndRole = async (
  email: string,
  role: string,
): Promise<ChatParticipant> => {
  if (!allowedChatRoles.includes(role as ChatRole)) {
    throw new AppError(403, "This role cannot use chat");
  }

  const auth = await AuthModel.findOne({
    email,
    role,
    is_deleted: false,
    is_blocked: false,
  });

  if (!auth) {
    throw new AppError(404, "Account not found");
  }

  return getParticipantByAuth(auth);
};

const getParticipantByAuth = async (auth: any): Promise<ChatParticipant> => {
  const role = auth.role as ChatRole;
  let profile: any = null;
  let name: string | null = null;
  let image: string | null = null;

  if (role === "user") {
    profile = await UserModel.findOne({
      email: auth.email,
      is_deleted: false,
      is_blocked: false,
    });
    name = profile?.name || null;
    image = profile?.image || null;
  } else if (role === "vendor") {
    profile = await VendorModel.findOne({
      email: auth.email,
      is_deleted: false,
      is_blocked: false,
    }).populate("store", "name cover_images");
    name = (profile as any)?.store?.name || profile?.email || null;
    image = (profile as any)?.store?.cover_images?.[0] || null;
  } else if (role === "rider") {
    profile = await RiderModel.findOne({
      email: auth.email,
      is_deleted: false,
      is_blocked: false,
    });
    name = profile?.name || null;
    image = profile?.image || null;
  }

  if (!profile) {
    throw new AppError(404, `${role} profile not found`);
  }

  return {
    auth: auth._id,
    profile: profile._id,
    role,
    email: auth.email,
    name,
    image,
  };
};

const getParticipantByAuthId = async (
  partnerId: string,
): Promise<ChatParticipant> => {
  const auth = await AuthModel.findOne({
    _id: partnerId,
    role: { $in: allowedChatRoles },
    is_deleted: false,
    is_blocked: false,
  });

  if (!auth) {
    throw new AppError(404, "Chat partner not found");
  }

  return getParticipantByAuth(auth);
};

const getLegacyVendorParticipant = async (
  vendorId: string,
): Promise<ChatParticipant> => {
  const vendor = await VendorModel.findOne({
    _id: vendorId,
    is_deleted: false,
    is_blocked: false,
  }).populate("store", "name cover_images");

  if (!vendor) {
    throw new AppError(404, "Vendor not found");
  }

  const auth = await AuthModel.findOne({
    email: vendor.email,
    role: "vendor",
    is_deleted: false,
    is_blocked: false,
  });

  if (!auth) {
    throw new AppError(404, "Vendor account not found");
  }

  return {
    auth: auth._id,
    profile: vendor._id,
    role: "vendor",
    email: vendor.email,
    name: (vendor as any)?.store?.name || vendor.email,
    image: (vendor as any)?.store?.cover_images?.[0] || null,
  };
};

const getParticipantSnapshot = (participant: ChatParticipant) => ({
  auth: participant.auth,
  profile: participant.profile,
  role: participant.role,
  email: participant.email,
  name: participant.name,
  image: participant.image,
});

const getCurrentParticipantKey = (conversation: any, currentUserEmail: string) =>
  conversation.participant_one?.email === currentUserEmail
    ? "participant_one"
    : conversation.participant_two?.email === currentUserEmail
      ? "participant_two"
      : null;

const getOtherParticipant = (conversation: any, currentUserEmail: string) =>
  conversation.participant_one?.email === currentUserEmail
    ? conversation.participant_two
    : conversation.participant_one;

const getUnreadCount = (conversation: any, currentUserEmail: string) => {
  const key = getCurrentParticipantKey(conversation, currentUserEmail);

  if (key === "participant_one") {
    return conversation.participant_one_unread_count || 0;
  }

  if (key === "participant_two") {
    return conversation.participant_two_unread_count || 0;
  }

  return 0;
};

const formatConversation = (conversation: any, currentUserEmail: string) => {
  const partner = getOtherParticipant(conversation, currentUserEmail);

  return {
    _id: conversation._id,
    partner: partner
      ? {
          auth_id: partner.auth,
          profile_id: partner.profile,
          name: partner.name || partner.email,
          image: partner.image || null,
          email: partner.email,
          role: partner.role,
        }
      : null,
    display_name: partner?.name || partner?.email || null,
    display_image: partner?.image || null,
    last_message: conversation.last_message,
    last_message_at: conversation.last_message_at,
    last_message_sender_role: conversation.last_message_sender_role,
    unread_count: getUnreadCount(conversation, currentUserEmail),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

const upsertConversation = async (
  currentParticipant: ChatParticipant,
  partner: ChatParticipant,
  responseUserEmail: string,
) => {
  if (currentParticipant.auth.toString() === partner.auth.toString()) {
    throw new AppError(400, "You cannot create a conversation with yourself");
  }

  const conversationKey = getConversationKey(
    currentParticipant.auth.toString(),
    partner.auth.toString(),
  );

  const conversation = await ConversationModel.findOneAndUpdate(
    { conversation_key: conversationKey },
    {
      $setOnInsert: {
        participant_one: getParticipantSnapshot(currentParticipant),
        participant_two: getParticipantSnapshot(partner),
        conversation_key: conversationKey,
        customer:
          currentParticipant.role === "user"
            ? currentParticipant.profile
            : partner.role === "user"
              ? partner.profile
              : null,
        vendor:
          currentParticipant.role === "vendor"
            ? currentParticipant.profile
            : partner.role === "vendor"
              ? partner.profile
              : null,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return formatConversation(conversation, responseUserEmail);
};

const createConversation = async (
  currentUserEmail: string,
  currentUserRole: string,
  partnerId: string,
) => {
  const currentParticipant = await getParticipantByEmailAndRole(
    currentUserEmail,
    currentUserRole,
  );

  let partner: ChatParticipant;
  try {
    partner = await getParticipantByAuthId(partnerId);
  } catch (error) {
    if (currentUserRole === "user") {
      partner = await getLegacyVendorParticipant(partnerId);
    } else {
      throw error;
    }
  }

  return upsertConversation(currentParticipant, partner, currentUserEmail);
};

const createOrReuseConversationBetweenAccounts = async (
  currentUser: { email: string; role: ChatRole },
  partnerUser: { email: string; role: ChatRole },
) => {
  const currentParticipant = await getParticipantByEmailAndRole(
    currentUser.email,
    currentUser.role,
  );
  const partner = await getParticipantByEmailAndRole(
    partnerUser.email,
    partnerUser.role,
  );

  return upsertConversation(currentParticipant, partner, currentUser.email);
};

const getConversations = async (
  currentUserEmail: string,
  currentUserRole: string,
  query: Record<string, any>,
) => {
  const currentParticipant = await getParticipantByEmailAndRole(
    currentUserEmail,
    currentUserRole,
  );

  const baseFilter = {
    is_deleted: false,
    $or: [
      { "participant_one.auth": currentParticipant.auth },
      { "participant_two.auth": currentParticipant.auth },
    ],
  };

  const conversationQuery = new QueryBuilder(
    ConversationModel.find(baseFilter).sort("-last_message_at"),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const meta = await conversationQuery.countTotal();
  const conversations = await conversationQuery.queryModel;
  const formattedConversations = conversations.map((conversation: any) =>
    formatConversation(conversation, currentUserEmail),
  );

  const searchTerm = query?.searchTerm?.toLowerCase()?.trim();
  const filteredData = searchTerm
    ? formattedConversations.filter((conversation) =>
        [
          conversation.display_name,
          conversation.last_message,
          conversation.partner?.name,
          conversation.partner?.email,
          conversation.partner?.role,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchTerm)),
      )
    : formattedConversations;

  return {
    data: filteredData,
    meta,
  };
};

const getConversationForParticipant = async (
  conversationId: string,
  currentUserEmail: string,
  currentUserRole: string,
) => {
  const currentParticipant = await getParticipantByEmailAndRole(
    currentUserEmail,
    currentUserRole,
  );

  const conversation = await ConversationModel.findOne({
    _id: conversationId,
    is_deleted: false,
    $or: [
      { "participant_one.auth": currentParticipant.auth },
      { "participant_two.auth": currentParticipant.auth },
    ],
  });

  if (!conversation) {
    throw new AppError(404, "Conversation not found");
  }

  return conversation;
};

const getConversationMessages = async (
  conversationId: string,
  currentUserEmail: string,
  currentUserRole: string,
  query: Record<string, any>,
) => {
  await getConversationForParticipant(
    conversationId,
    currentUserEmail,
    currentUserRole,
  );

  const messageQuery = new QueryBuilder(
    ChatMessageModel.find({
      conversation: conversationId,
      is_deleted: false,
    }).sort("-createdAt"),
    query,
  )
    .filter()
    .paginate();

  const meta = await messageQuery.countTotal();
  const messages = await messageQuery.queryModel;

  return {
    data: messages.reverse(),
    meta,
  };
};

const markConversationAsRead = async (
  conversationId: string,
  currentUserEmail: string,
  currentUserRole: string,
) => {
  const conversation = await getConversationForParticipant(
    conversationId,
    currentUserEmail,
    currentUserRole,
  );

  await ChatMessageModel.updateMany(
    {
      conversation: conversation._id,
      receiver_email: currentUserEmail,
      is_read: false,
      is_deleted: false,
    },
    {
      is_read: true,
      read_at: new Date(),
    },
  );

  const currentParticipantKey = getCurrentParticipantKey(
    conversation,
    currentUserEmail,
  );
  const updateData =
    currentParticipantKey === "participant_one"
      ? { participant_one_unread_count: 0 }
      : { participant_two_unread_count: 0 };

  const updatedConversation = await ConversationModel.findByIdAndUpdate(
    conversation._id,
    updateData,
    { new: true },
  );

  return formatConversation(updatedConversation, currentUserEmail);
};

const createMessage = async (
  conversationId: string,
  currentUserEmail: string,
  currentUserRole: string,
  text: string,
) => {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new AppError(400, "Message text is required");
  }

  const conversation = await getConversationForParticipant(
    conversationId,
    currentUserEmail,
    currentUserRole,
  );

  const currentParticipantKey = getCurrentParticipantKey(
    conversation,
    currentUserEmail,
  );
  const currentParticipant =
    currentParticipantKey === "participant_one"
      ? conversation.participant_one
      : conversation.participant_two;
  const receiver =
    currentParticipantKey === "participant_one"
      ? conversation.participant_two
      : conversation.participant_one;

  if (!currentParticipant || !receiver) {
    throw new AppError(404, "Conversation participant not found");
  }

  const message = await ChatMessageModel.create({
    conversation: conversation._id,
    sender_email: currentUserEmail,
    sender_role: currentParticipant.role,
    receiver_email: receiver.email,
    text: trimmedText,
  });

  const unreadUpdate =
    currentParticipantKey === "participant_one"
      ? {
          $inc: { participant_two_unread_count: 1 },
          $set: { participant_one_unread_count: 0 },
        }
      : {
          $inc: { participant_one_unread_count: 1 },
          $set: { participant_two_unread_count: 0 },
        };

  const updatedConversation = await ConversationModel.findByIdAndUpdate(
    conversation._id,
    {
      $inc: unreadUpdate.$inc,
      $set: {
        ...unreadUpdate.$set,
        last_message: trimmedText,
        last_message_at: new Date(),
        last_message_sender_role: currentParticipant.role,
      },
    },
    { new: true },
  );

  return {
    message,
    conversation: updatedConversation,
  };
};

export const chatServices = {
  createConversation,
  createOrReuseConversationBetweenAccounts,
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  getConversationForParticipant,
  createMessage,
};
