const generateVoucherCode = (): string => {
  const datePart = new Date().getTime().toString().slice(-6);
  const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
  return `V${datePart}${randomPart}`;
};

export { generateVoucherCode };