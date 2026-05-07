// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumbers: true,
  requiresSpecialChars: true,
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface FarmerSignupValidationInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  farmLatitude: string;
  farmLongitude: string;
  idProofFileName: string;
  idProofFileSize: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export interface BuyerSignupValidationInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  location: string;
  farmLatitude: string;
  farmLongitude: string;
  profilePhotoFileName: string;
  profilePhotoDataUrl: string;
  idProofFileName: string;
  idProofFileSize: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

// Validate email
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

// Validate password strength
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`;
  }
  
  if (PASSWORD_REQUIREMENTS.requiresUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  if (PASSWORD_REQUIREMENTS.requiresLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  if (PASSWORD_REQUIREMENTS.requiresNumbers && !/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  if (PASSWORD_REQUIREMENTS.requiresSpecialChars && !SPECIAL_CHAR_REGEX.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*)';
  }
  
  return null;
};

// Validate name
export const validateName = (name: string): string | null => {
  if (!name || name.trim() === '') {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (name.trim().length > 100) {
    return 'Name must be less than 100 characters';
  }
  return null;
};

// Validate phone number (basic validation)
export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return 'Phone number is required';
  }
  const phoneRegex = /^[0-9\s+()-]{7,}$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number';
  }
  return null;
};

// Validate location
export const validateLocation = (location: string): string | null => {
  if (!location || location.trim() === '') {
    return 'Location is required';
  }
  if (location.trim().length < 3) {
    return 'Location must be at least 3 characters';
  }
  return null;
};

// Validate password match
export const validatePasswordMatch = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

const validateCoordinates = (latitude: string, longitude: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    errors.push({ field: 'farmLatitude', message: 'Enter a valid latitude between -90 and 90' });
  }

  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    errors.push({ field: 'farmLongitude', message: 'Enter a valid longitude between -180 and 180' });
  }

  return errors;
};

const validateIdProof = (fileName: string, fileSize: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  const allowedExtension = /\.(pdf|png|jpg|jpeg)$/i;
  const maxSizeInBytes = 5 * 1024 * 1024;

  if (!fileName.trim()) {
    errors.push({ field: 'idProof', message: 'ID proof upload is required' });
    return errors;
  }

  if (!allowedExtension.test(fileName)) {
    errors.push({ field: 'idProof', message: 'Upload PDF, PNG, JPG, or JPEG file only' });
  }

  if (fileSize <= 0 || fileSize > maxSizeInBytes) {
    errors.push({ field: 'idProof', message: 'ID proof must be less than 5 MB' });
  }

  return errors;
};

const validateProfilePhoto = (fileName: string, dataUrl: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!dataUrl.trim()) {
    errors.push({ field: 'profilePhoto', message: 'Profile photo is required' });
    return errors;
  }

  if (fileName.trim() && !/\.(png|jpg|jpeg|webp)$/i.test(fileName.trim())) {
    errors.push({ field: 'profilePhoto', message: 'Upload a PNG, JPG, JPEG, or WEBP image' });
  }

  return errors;
};

const validatePaymentDetails = (
  bankName: string,
  accountNumber: string,
  ifscCode: string,
  upiId: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const hasBankDetails = bankName.trim() || accountNumber.trim() || ifscCode.trim();
  const hasUpi = upiId.trim().length > 0;

  if (!hasBankDetails && !hasUpi) {
    errors.push({ field: 'paymentDetails', message: 'Provide bank details or a UPI ID' });
    return errors;
  }

  if (hasBankDetails) {
    if (!bankName.trim()) {
      errors.push({ field: 'bankName', message: 'Bank name is required when adding bank details' });
    }

    if (!/^\d{9,18}$/.test(accountNumber.trim())) {
      errors.push({ field: 'accountNumber', message: 'Account number must be 9 to 18 digits' });
    }

    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode.trim())) {
      errors.push({ field: 'ifscCode', message: 'Enter a valid IFSC code (e.g. HDFC0001234)' });
    }
  }

  if (hasUpi && !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) {
    errors.push({ field: 'upiId', message: 'Enter a valid UPI ID (e.g. farmer@upi)' });
  }

  return errors;
};

export const validateFarmerSignupForm = (formData: FarmerSignupValidationInput): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameError = validateName(formData.name);
  if (nameError) errors.push({ field: 'name', message: nameError });

  const emailError = validateEmail(formData.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push({ field: 'password', message: passwordError });

  const passwordMatchError = validatePasswordMatch(formData.password, formData.confirmPassword);
  if (passwordMatchError) errors.push({ field: 'confirmPassword', message: passwordMatchError });

  const phoneError = validatePhone(formData.phone);
  if (phoneError) errors.push({ field: 'phone', message: phoneError });

  if (!formData.address.trim() || formData.address.trim().length < 10) {
    errors.push({ field: 'address', message: 'Address must be at least 10 characters' });
  }

  errors.push(...validateCoordinates(formData.farmLatitude, formData.farmLongitude));
  errors.push(...validateIdProof(formData.idProofFileName, formData.idProofFileSize));
  errors.push(
    ...validatePaymentDetails(
      formData.bankName,
      formData.accountNumber,
      formData.ifscCode,
      formData.upiId
    )
  );

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateBuyerSignupForm = (formData: BuyerSignupValidationInput): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameError = validateName(formData.name);
  if (nameError) errors.push({ field: 'name', message: nameError });

  const emailError = validateEmail(formData.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push({ field: 'password', message: passwordError });

  const passwordMatchError = validatePasswordMatch(formData.password, formData.confirmPassword);
  if (passwordMatchError) errors.push({ field: 'confirmPassword', message: passwordMatchError });

  const phoneError = validatePhone(formData.phone);
  if (phoneError) errors.push({ field: 'phone', message: phoneError });

  const locationError = validateLocation(formData.location);
  if (locationError) errors.push({ field: 'location', message: locationError });

  errors.push(...validateCoordinates(formData.farmLatitude, formData.farmLongitude));
  errors.push(...validateProfilePhoto(formData.profilePhotoFileName, formData.profilePhotoDataUrl));
  errors.push(...validateIdProof(formData.idProofFileName, formData.idProofFileSize));
  errors.push(
    ...validatePaymentDetails(
      formData.bankName,
      formData.accountNumber,
      formData.ifscCode,
      formData.upiId
    )
  );

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate signup form
export const validateSignupForm = (formData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  location: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameError = validateName(formData.name);
  if (nameError) errors.push({ field: 'name', message: nameError });

  const emailError = validateEmail(formData.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.push({ field: 'password', message: passwordError });

  const passwordMatchError = validatePasswordMatch(formData.password, formData.confirmPassword);
  if (passwordMatchError) errors.push({ field: 'confirmPassword', message: passwordMatchError });

  const phoneError = validatePhone(formData.phone);
  if (phoneError) errors.push({ field: 'phone', message: phoneError });

  const locationError = validateLocation(formData.location);
  if (locationError) errors.push({ field: 'location', message: locationError });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate login form
export const validateLoginForm = (formData: {
  email: string;
  password: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(formData.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  if (!formData.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Get password strength percentage
export const getPasswordStrength = (password: string): number => {
  let strength = 0;
  
  if (password.length >= PASSWORD_REQUIREMENTS.minLength) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[a-z]/.test(password)) strength += 20;
  if (/\d/.test(password)) strength += 20;
  if (SPECIAL_CHAR_REGEX.test(password)) strength += 20;
  
  return Math.min(strength, 100);
};

// Get password strength label
export const getPasswordStrengthLabel = (password: string): { label: string; color: string } => {
  const strength = getPasswordStrength(password);
  
  if (strength < 40) return { label: 'Weak', color: 'red' };
  if (strength < 70) return { label: 'Fair', color: 'yellow' };
  return { label: 'Strong', color: 'green' };
};
