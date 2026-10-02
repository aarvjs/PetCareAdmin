export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

export const validateIndianMobile = (phone: string): boolean => {
  // Accepts 10 digits starting with 6-9 or +91 format
  const cleaned = phone.replace(/[\s-]/g, '');
  const re = /^(?:\+91)?[6-9]\d{9}$/;
  return re.test(cleaned);
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long.' };
  }
  return { isValid: true };
};
