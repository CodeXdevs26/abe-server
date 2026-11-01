export const generateOrderId = (): string => {
  const timestampPart = Date.now().toString().slice(-8);
  const randomPart = Math.floor(100 + Math.random() * 900);
  const id = `#${timestampPart}${randomPart}`;
  return id;
};
