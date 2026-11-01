export const buildDeliveryLocation = (addressSource: any) => {
  if (!addressSource) return "";

  const { country, state, city, zip_code, street_address, house_no, address } =
    addressSource;

  const normalizedAddress =
    typeof address === "string" ? address.trim() : String(address || "").trim();
  if (normalizedAddress && normalizedAddress.toLowerCase() !== "null") {
    return normalizedAddress;
  }

  return [country, state, city, zip_code, street_address, house_no]
    .map((value) =>
      typeof value === "string" ? value.trim() : String(value || "").trim(),
    )
    .filter((value) => value && value.toLowerCase() !== "null")
    .join(", ");
};
