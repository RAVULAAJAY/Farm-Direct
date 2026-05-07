import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, MapPin, Navigation, Upload, ShieldCheck, Camera } from 'lucide-react';
import {
  validateSignupForm,
  validateLoginForm,
  validateFarmerSignupForm,
  validateBuyerSignupForm,
  getPasswordStrengthLabel,
  ValidationError,
} from '@/lib/validation';
import { getAdminLoginEmail, hasAdminLoginCredentials, isAdminCredentialMatch } from '@/lib/adminAuth';
import { UserRole, type User } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';
import BrandLogo from '@/components/BrandLogo';

interface EnhancedAuthFormProps {
  role: UserRole;
  mode: 'login' | 'signup';
  onSuccess: (user: User) => void;
  onBack: () => void;
  onModeChange: (mode: 'login' | 'signup') => void;
}

const roleStyles: Record<UserRole, { label: string; panelClass: string; titleClass: string; buttonClass: string; linkClass: string; emoji: string }> = {
  farmer: {
    label: 'Farmer',
    panelClass: 'from-emerald-50 via-lime-50 to-teal-100',
    titleClass: 'text-emerald-700',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
    linkClass: 'text-emerald-700 hover:text-emerald-800',
    emoji: '🧑‍🌾',
  },
  buyer: {
    label: 'Buyer',
    panelClass: 'from-blue-50 via-sky-50 to-cyan-100',
    titleClass: 'text-blue-700',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
    linkClass: 'text-blue-700 hover:text-blue-800',
    emoji: '🧑‍💼',
  },
  admin: {
    label: 'Admin',
    panelClass: 'from-slate-50 via-zinc-50 to-gray-100',
    titleClass: 'text-slate-700',
    buttonClass: 'bg-slate-700 hover:bg-slate-800',
    linkClass: 'text-slate-700 hover:text-slate-900',
    emoji: '🔐',
  },
};

const passwordLabelColor: Record<'red' | 'yellow' | 'green', string> = {
  red: 'text-red-600',
  yellow: 'text-amber-600',
  green: 'text-emerald-600',
};

const passwordBarColor: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
  green: 'bg-emerald-500',
};

const EnhancedAuthForm: React.FC<EnhancedAuthFormProps> = ({ role, mode, onSuccess, onBack, onModeChange }) => {
  const { users, upsertUser } = useGlobalState();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    address: '',
    farmLatitude: '',
    farmLongitude: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [isLocatingFarm, setIsLocatingFarm] = useState(false);
  const [isLocatingBuyer, setIsLocatingBuyer] = useState(false);
  const [idProofFileName, setIdProofFileName] = useState('');
  const [idProofFileSize, setIdProofFileSize] = useState(0);
  const [idProofDataUrl, setIdProofDataUrl] = useState('');
  const [buyerIdProofFileName, setBuyerIdProofFileName] = useState('');
  const [buyerIdProofFileSize, setBuyerIdProofFileSize] = useState(0);
  const [buyerIdProofDataUrl, setBuyerIdProofDataUrl] = useState('');
  const [farmerPhotoName, setFarmerPhotoName] = useState('');
  const [farmerProfilePhoto, setFarmerProfilePhoto] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isBuyerLocationGranted, setIsBuyerLocationGranted] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const roleStyle = roleStyles[role];
  const effectiveMode = role === 'admin' ? 'login' : mode;
  const isFarmerSignup = role === 'farmer' && effectiveMode === 'signup';
  const isBuyerSignup = role === 'buyer' && effectiveMode === 'signup';
  const containerWidthClass = effectiveMode === 'login' ? 'max-w-2xl' : isFarmerSignup ? 'max-w-5xl' : 'max-w-4xl';
  const compactFieldGroupClass = effectiveMode === 'login' ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  const passwordStrength = effectiveMode === 'signup' ? getPasswordStrengthLabel(formData.password) : null;

  const mapPreviewSrc = useMemo(() => {
    const lat = Number(formData.farmLatitude);
    const lng = Number(formData.farmLongitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return '';
    }

    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }, [formData.farmLatitude, formData.farmLongitude]);

  const updateField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }

    if (name === 'location') {
      setIsBuyerLocationGranted(false);
    }

    setGeneralError('');
  };

  const setFieldError = (field: string, message: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });

  const stopCameraStream = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const openLiveCamera = async () => {
    setCameraError('');
    setIsCameraStarting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);

      window.setTimeout(async () => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          try {
            await cameraVideoRef.current.play();
          } catch {
            // Some browsers block autoplay; the stream can still be captured.
          }
        }
      }, 0);
    } catch {
      setCameraError('Unable to open the camera. Please allow camera access or upload an existing photo.');
      setIsCameraOpen(false);
      stopCameraStream();
    } finally {
      setIsCameraStarting(false);
    }
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
    setCameraError('');
    stopCameraStream();
  };

  const captureCameraPhoto = () => {
    const video = cameraVideoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is not ready yet.');
      return;
    }

    const squareSize = Math.min(video.videoWidth, video.videoHeight);
    const sourceX = Math.floor((video.videoWidth - squareSize) / 2);
    const sourceY = Math.floor((video.videoHeight - squareSize) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 960;

    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Unable to capture photo right now.');
      return;
    }

    context.drawImage(video, sourceX, sourceY, squareSize, squareSize, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFarmerProfilePhoto(dataUrl);
    setFarmerPhotoName('live-photo.jpg');
    setFieldErrors((prev) => ({ ...prev, profilePhoto: '' }));
    closeCamera();
  };

  const requestLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported in this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  };

  const handleDetectAddress = async () => {
    setIsLocatingAddress(true);
    setGeneralError('');

    try {
      const position = await requestLocation();
      const latitude = position.coords.latitude.toFixed(6);
      const longitude = position.coords.longitude.toFixed(6);

      updateField('farmLatitude', latitude);
      updateField('farmLongitude', longitude);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Unable to fetch address from current location.');
      }

      const data = (await response.json()) as { display_name?: string };
      if (data.display_name) {
        updateField('address', data.display_name);
      }
    } catch {
      setGeneralError('Unable to detect address right now. You can enter it manually.');
    } finally {
      setIsLocatingAddress(false);
    }
  };

  const handleDetectFarmLocation = async () => {
    setIsLocatingFarm(true);
    setGeneralError('');

    try {
      const position = await requestLocation();
      updateField('farmLatitude', position.coords.latitude.toFixed(6));
      updateField('farmLongitude', position.coords.longitude.toFixed(6));
    } catch {
      setGeneralError('Unable to detect farm coordinates right now.');
    } finally {
      setIsLocatingFarm(false);
    }
  };

  const handleDetectBuyerLocation = async () => {
    setIsLocatingBuyer(true);
    setGeneralError('');

    try {
      const position = await requestLocation();
      const latitude = position.coords.latitude.toFixed(6);
      const longitude = position.coords.longitude.toFixed(6);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Unable to fetch location details');
      }

      const data = (await response.json()) as { display_name?: string };
      const locationValue = data.display_name
        ? `${data.display_name} (${latitude}, ${longitude})`
        : `${latitude}, ${longitude}`;
      updateField('location', locationValue);
      updateField('farmLatitude', latitude);
      updateField('farmLongitude', longitude);
      setIsBuyerLocationGranted(true);
    } catch {
      setIsBuyerLocationGranted(false);
      setFieldError('location', 'Location access is required to show nearby products.');
    } finally {
      setIsLocatingBuyer(false);
    }
  };

  const handleUploadIdProof = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIdProofDataUrl(await readFileAsDataUrl(file));
    } catch {
      setIdProofDataUrl('');
    }
    setIdProofFileName(file.name);
    setIdProofFileSize(file.size);

    if (fieldErrors.idProof) {
      setFieldErrors((prev) => ({ ...prev, idProof: '' }));
    }
  };

  const handleBuyerIdProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setBuyerIdProofDataUrl(await readFileAsDataUrl(file));
    } catch {
      setBuyerIdProofDataUrl('');
    }
    setBuyerIdProofFileName(file.name);
    setBuyerIdProofFileSize(file.size);

    if (fieldErrors.idProof) {
      setFieldErrors((prev) => ({ ...prev, idProof: '' }));
    }
  };

  const handleFarmerPhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFieldError('profilePhoto', 'Please choose an image file for the profile photo.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldError('profilePhoto', 'Profile photo must be less than 5 MB.');
      event.target.value = '';
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setFarmerProfilePhoto(dataUrl);
    setFarmerPhotoName(`Uploaded photo: ${file.name}`);

    if (fieldErrors.profilePhoto) {
      setFieldErrors((prev) => ({ ...prev, profilePhoto: '' }));
    }

    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setGeneralError('');
    setFieldErrors({});

    const submitMode = role === 'admin' ? 'login' : mode;

    if (role === 'admin') {
      if (!hasAdminLoginCredentials()) {
        setGeneralError('Admin access is not configured on this device.');
        setIsSubmitting(false);
        return;
      }

      if (!isAdminCredentialMatch(formData.email, formData.password)) {
        setGeneralError('Invalid admin credentials.');
        setIsSubmitting(false);
        return;
      }

      const adminUser: User = {
        id: 'admin_primary',
        name: 'Platform Admin',
        email: getAdminLoginEmail(),
        phone: '',
        location: 'HQ',
        role: 'admin',
        isActive: true,
        loginCount: 1,
        createdAt: new Date().toISOString(),
      };

      onSuccess(adminUser);
      setIsSubmitting(false);
      return;
    }

    try {
      const validationResult =
        submitMode === 'signup'
          ? isFarmerSignup
            ? validateFarmerSignupForm({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                phone: formData.phone,
                address: formData.address,
                farmLatitude: formData.farmLatitude,
                farmLongitude: formData.farmLongitude,
                idProofFileName,
                idProofFileSize,
                bankName: formData.bankName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                upiId: formData.upiId,
              })
            : isBuyerSignup
            ? validateBuyerSignupForm({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                phone: formData.phone,
                location: formData.location,
                farmLatitude: formData.farmLatitude,
                farmLongitude: formData.farmLongitude,
                profilePhotoFileName: farmerPhotoName,
                profilePhotoDataUrl: farmerProfilePhoto,
                idProofFileName: buyerIdProofFileName,
                idProofFileSize: buyerIdProofFileSize,
                bankName: formData.bankName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                upiId: formData.upiId,
              })
            : validateSignupForm({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                phone: formData.phone,
                location: formData.location,
              })
          : validateLoginForm({
              email: formData.email,
              password: formData.password,
            });

      if (!validationResult.isValid) {
        const errors: Record<string, string> = {};
        validationResult.errors.forEach((error: ValidationError) => {
          errors[error.field] = error.message;
        });
        setFieldErrors(errors);
        setIsSubmitting(false);
        return;
      }

      if (isBuyerSignup) {
        const signupErrors: Record<string, string> = {};

        if (!isBuyerLocationGranted) {
          signupErrors.location = 'Allow location access to enable nearby results.';
        }

        if (!farmerProfilePhoto) {
          signupErrors.profilePhoto = 'Add a profile photo to complete signup.';
        }

        if (!buyerIdProofFileName) {
          signupErrors.idProof = 'Add ID proof to complete signup.';
        }

        if (Object.keys(signupErrors).length > 0) {
          setFieldErrors(signupErrors);
          setIsSubmitting(false);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 600));

      const normalizedEmail = formData.email.trim().toLowerCase();
      const existingUser = users.find(
        (entry) => entry.email.trim().toLowerCase() === normalizedEmail && entry.role === role
      );

      if (submitMode === 'login' && !existingUser) {
        setGeneralError('No account found for this role. Please sign up first.');
        setIsSubmitting(false);
        return;
      }

      if (submitMode === 'signup' && existingUser) {
        setGeneralError('An account with this email already exists for this role. Please sign in.');
        setIsSubmitting(false);
        return;
      }

      if (submitMode === 'login' && existingUser && existingUser.isActive === false) {
        setGeneralError('Your account is disabled by admin. Please contact support.');
        setIsSubmitting(false);
        return;
      }

      const user: User =
        submitMode === 'login' && existingUser
          ? existingUser
          : {
              id: existingUser?.id ?? `${role}_${Date.now()}`,
              name: submitMode === 'signup' ? formData.name.trim() : existingUser?.name ?? formData.email.split('@')[0],
              email: normalizedEmail,
              phone: submitMode === 'signup' ? formData.phone.trim() : existingUser?.phone ?? '',
              location:
                submitMode === 'signup'
                  ? (isFarmerSignup ? formData.address.trim() : formData.location.trim())
                  : existingUser?.location ?? '',
              role,
              profilePhoto:
                role === 'farmer' || role === 'buyer'
                  ? farmerProfilePhoto || existingUser?.profilePhoto
                  : existingUser?.profilePhoto,
              farmName: role === 'farmer' ? existingUser?.farmName ?? `${formData.name.trim()}'s Farm` : undefined,
              cropTypes: role === 'farmer' ? existingUser?.cropTypes ?? ['Mixed Crops'] : undefined,
              paymentDetails:
                role === 'farmer' || role === 'buyer'
                  ? {
                      bankName: formData.bankName.trim() || existingUser?.paymentDetails?.bankName || 'UPI Only',
                      accountNumber:
                        formData.accountNumber.trim() ||
                        existingUser?.paymentDetails?.accountNumber ||
                        '000000000',
                      ifscOrUpi:
                        formData.upiId.trim() ||
                        formData.ifscCode.trim() ||
                        existingUser?.paymentDetails?.ifscOrUpi ||
                        '',
                    }
                  : existingUser?.paymentDetails,
              farmDetails:
                role === 'farmer'
                  ? `Farm at ${formData.address.trim()} | Coordinates ${formData.farmLatitude}, ${formData.farmLongitude}`
                  : existingUser?.farmDetails,
              farmerOnboarding:
                role === 'farmer' && submitMode === 'signup'
                  ? {
                      address: formData.address.trim(),
                      farmLocation: {
                        latitude: Number(formData.farmLatitude),
                        longitude: Number(formData.farmLongitude),
                      },
                      idProofFileName,
                      idProofDataUrl: idProofDataUrl || undefined,
                      upiId: formData.upiId.trim() || undefined,
                      ifscCode: formData.ifscCode.trim() || undefined,
                      bankAccountNumber: formData.accountNumber.trim() || undefined,
                      bankName: formData.bankName.trim() || undefined,
                      phoneVerified: true,
                    }
                  : existingUser?.farmerOnboarding,
              buyerOnboarding:
                role === 'buyer' && submitMode === 'signup'
                  ? {
                      location: formData.location.trim(),
                      locationCoordinates: {
                        latitude: Number(formData.farmLatitude),
                        longitude: Number(formData.farmLongitude),
                      },
                      profilePhotoFileName: farmerPhotoName || undefined,
                      idProofFileName: buyerIdProofFileName || undefined,
                      idProofDataUrl: buyerIdProofDataUrl || undefined,
                    }
                  : existingUser?.buyerOnboarding,
              createdAt: existingUser?.createdAt ?? new Date().toISOString(),
            };

      upsertUser(user);
      onSuccess(user);
    } catch {
      setGeneralError('An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const strengthColor = (passwordStrength?.color ?? 'red') as 'red' | 'yellow' | 'green';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${roleStyle.panelClass} px-4 py-6 md:py-10`}>
      <div className={`mx-auto w-full ${containerWidthClass}`}>
        <Card className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-2xl backdrop-blur">
          <CardHeader className="relative border-b border-white/70 pb-6 pt-8">
            <Button variant="ghost" onClick={onBack} className="absolute left-4 top-4 p-2 h-auto">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="text-center pt-6">
              <BrandLogo
                className="justify-center mb-3"
                imageClassName="h-12 w-12"
                textClassName="text-3xl font-semibold tracking-tight text-slate-900"
              />
              <CardTitle className={`text-3xl ${roleStyle.titleClass}`}>
                {effectiveMode === 'login' ? 'Welcome Back' : `Create ${roleStyle.label} Account`}
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                {effectiveMode === 'login'
                  ? `Sign in to your ${roleStyle.label.toLowerCase()} account`
                  : isFarmerSignup
                  ? 'Complete verified onboarding to access your farmer dashboard'
                  : `Sign up as a ${roleStyle.label.toLowerCase()}`}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-8 pt-6 md:px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {generalError && (
                <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{generalError}</p>
                </div>
              )}

              {effectiveMode === 'signup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Enter your full name"
                      className={fieldErrors.name ? 'border-red-500' : ''}
                    />
                    {fieldErrors.name && <p className="text-sm text-red-600">{fieldErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="name@example.com"
                      className={fieldErrors.email ? 'border-red-500' : ''}
                    />
                    {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}
                  </div>
                </div>
              )}

              {effectiveMode === 'login' && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="name@example.com"
                      className={fieldErrors.email ? 'border-red-500' : ''}
                    />
                    {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}
                  </div>
                </div>
              )}

              <div className={compactFieldGroupClass}>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder={effectiveMode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                      className={`pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-sm text-red-600">{fieldErrors.password}</p>}
                </div>

                {effectiveMode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        placeholder="Re-enter your password"
                        className={`pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-gray-500"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                )}
              </div>

              {effectiveMode === 'signup' && passwordStrength && (
                <div className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Password Strength</p>
                    <span className={`text-sm font-semibold ${passwordLabelColor[strengthColor]}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${passwordBarColor[strengthColor]}`}
                      style={{ width: `${Math.min((formData.password.length / 16) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {effectiveMode === 'signup' && !isFarmerSignup && !isBuyerSignup && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="Enter phone number"
                      className={fieldErrors.phone ? 'border-red-500' : ''}
                    />
                    {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="Enter your location"
                      className={fieldErrors.location ? 'border-red-500' : ''}
                    />
                    {fieldErrors.location && <p className="text-sm text-red-600">{fieldErrors.location}</p>}
                  </div>
                </div>
              )}

              {isBuyerSignup && (
                <div className="space-y-6">
                  <div className="rounded-xl border bg-white p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          placeholder="Enter phone number"
                          className={fieldErrors.phone ? 'border-red-500' : ''}
                        />
                        {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white p-4 md:p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Location Access (Required)</h3>
                    </div>

                    <p className="text-sm text-gray-600">
                      We use your location to show nearby farmers and faster delivery options.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="location">Detected Location</Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        readOnly
                        placeholder="Allow location access to auto-fill"
                        className={fieldErrors.location ? 'border-red-500' : 'bg-gray-50'}
                      />
                      {fieldErrors.location && <p className="text-sm text-red-600">{fieldErrors.location}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDetectBuyerLocation}
                        disabled={isLocatingBuyer}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        {isLocatingBuyer ? 'Detecting...' : 'Allow Location Access'}
                      </Button>

                      {isBuyerLocationGranted && (
                        <span className="text-sm text-emerald-700 font-medium">Location access granted</span>
                      )}
                    </div>

                    {mapPreviewSrc && (
                      <div className="rounded-lg overflow-hidden border h-64">
                        <iframe
                          title="Buyer location map"
                          src={mapPreviewSrc}
                          className="h-full w-full"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border bg-white p-4 md:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Profile Photo</h3>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="h-28 w-28 overflow-hidden rounded-2xl border bg-gray-50 flex items-center justify-center shrink-0">
                        {farmerProfilePhoto ? (
                          <img src={farmerProfilePhoto} alt="Buyer preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-center px-3 text-xs text-gray-500">No photo selected</div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50">
                            <Upload className="h-4 w-4" />
                            Upload Existing Photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFarmerPhotoUpload}
                            />
                          </label>
                          <Button type="button" variant="outline" className="gap-2" onClick={openLiveCamera} disabled={isCameraStarting}>
                            <Camera className="h-4 w-4" />
                            {isCameraStarting ? 'Opening Camera...' : 'Take Live Photo'}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600">
                          {farmerPhotoName || 'Choose an existing photo or capture a live photo.'}
                        </p>
                        {fieldErrors.profilePhoto && <p className="text-sm text-red-600">{fieldErrors.profilePhoto}</p>}
                        {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white p-4 md:p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">ID Proof & Payment Details</h3>

                    <div className="space-y-2">
                      <Label htmlFor="buyerIdProof">ID Proof Upload (PDF/JPG/PNG, max 5 MB)</Label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50">
                          <Upload className="h-4 w-4" />
                          Upload File
                          <input
                            id="buyerIdProof"
                            name="buyerIdProof"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={handleBuyerIdProofUpload}
                          />
                        </label>
                        <span className="text-sm text-gray-600">
                          {buyerIdProofFileName || 'No file selected'}
                        </span>
                      </div>
                      {fieldErrors.idProof && <p className="text-sm text-red-600">{fieldErrors.idProof}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          name="bankName"
                          value={formData.bankName}
                          onChange={(e) => updateField('bankName', e.target.value)}
                          placeholder="e.g. HDFC Bank"
                          className={fieldErrors.bankName ? 'border-red-500' : ''}
                        />
                        {fieldErrors.bankName && <p className="text-sm text-red-600">{fieldErrors.bankName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={(e) => updateField('accountNumber', e.target.value)}
                          placeholder="9 to 18 digit account number"
                          className={fieldErrors.accountNumber ? 'border-red-500' : ''}
                        />
                        {fieldErrors.accountNumber && (
                          <p className="text-sm text-red-600">{fieldErrors.accountNumber}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ifscCode">IFSC Code</Label>
                        <Input
                          id="ifscCode"
                          name="ifscCode"
                          value={formData.ifscCode}
                          onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                          placeholder="e.g. SBIN0001234"
                          className={fieldErrors.ifscCode ? 'border-red-500' : ''}
                        />
                        {fieldErrors.ifscCode && <p className="text-sm text-red-600">{fieldErrors.ifscCode}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="upiId">UPI ID</Label>
                        <Input
                          id="upiId"
                          name="upiId"
                          value={formData.upiId}
                          onChange={(e) => updateField('upiId', e.target.value)}
                          placeholder="e.g. buyer@upi"
                          className={fieldErrors.upiId ? 'border-red-500' : ''}
                        />
                        {fieldErrors.upiId && <p className="text-sm text-red-600">{fieldErrors.upiId}</p>}
                      </div>
                    </div>

                    {fieldErrors.paymentDetails && (
                      <p className="text-sm text-red-600">{fieldErrors.paymentDetails}</p>
                    )}
                  </div>
                </div>
              )}

              {isFarmerSignup && (
                <div className="space-y-6">
                  <div className="rounded-xl border bg-white p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Verification & Contact</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          placeholder="Enter phone number"
                          className={fieldErrors.phone ? 'border-red-500' : ''}
                        />
                        {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white p-4 md:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Farmer Photo</h3>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="h-28 w-28 overflow-hidden rounded-2xl border bg-gray-50 flex items-center justify-center shrink-0">
                        {farmerProfilePhoto ? (
                          <img src={farmerProfilePhoto} alt="Farmer preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-center px-3 text-xs text-gray-500">No photo selected</div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50">
                            <Upload className="h-4 w-4" />
                            Upload Existing Photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFarmerPhotoUpload}
                            />
                          </label>
                              <Button type="button" variant="outline" className="gap-2" onClick={openLiveCamera} disabled={isCameraStarting}>
                                <Camera className="h-4 w-4" />
                                {isCameraStarting ? 'Opening Camera...' : 'Take Live Photo'}
                              </Button>
                        </div>
                        <p className="text-sm text-gray-600">
                          {farmerPhotoName || 'Choose an existing photo or capture a live photo.'}
                        </p>
                        {fieldErrors.profilePhoto && <p className="text-sm text-red-600">{fieldErrors.profilePhoto}</p>}
                            {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Address & Farm Location</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder="Village, district, state, and pincode"
                        className={fieldErrors.address ? 'border-red-500' : ''}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDetectAddress}
                          disabled={isLocatingAddress}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          {isLocatingAddress ? 'Detecting...' : 'Use Current Location for Address'}
                        </Button>
                      </div>
                      {fieldErrors.address && <p className="text-sm text-red-600">{fieldErrors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="farmLatitude">Farm Latitude</Label>
                        <Input
                          id="farmLatitude"
                          name="farmLatitude"
                          value={formData.farmLatitude}
                          onChange={(e) => updateField('farmLatitude', e.target.value)}
                          placeholder="e.g. 28.6139"
                          className={fieldErrors.farmLatitude ? 'border-red-500' : ''}
                        />
                        {fieldErrors.farmLatitude && (
                          <p className="text-sm text-red-600">{fieldErrors.farmLatitude}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="farmLongitude">Farm Longitude</Label>
                        <Input
                          id="farmLongitude"
                          name="farmLongitude"
                          value={formData.farmLongitude}
                          onChange={(e) => updateField('farmLongitude', e.target.value)}
                          placeholder="e.g. 77.2090"
                          className={fieldErrors.farmLongitude ? 'border-red-500' : ''}
                        />
                        {fieldErrors.farmLongitude && (
                          <p className="text-sm text-red-600">{fieldErrors.farmLongitude}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDetectFarmLocation}
                      disabled={isLocatingFarm}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      {isLocatingFarm ? 'Detecting...' : 'Detect Farm Coordinates'}
                    </Button>

                    {mapPreviewSrc && (
                      <div className="rounded-lg overflow-hidden border h-64">
                        <iframe
                          title="Farm location map"
                          src={mapPreviewSrc}
                          className="h-full w-full"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border bg-white p-4 md:p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">ID Proof & Payment Details</h3>

                    <div className="space-y-2">
                      <Label htmlFor="idProof">ID Proof Upload (PDF/JPG/PNG, max 5 MB)</Label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium cursor-pointer hover:bg-gray-50">
                          <Upload className="h-4 w-4" />
                          Upload File
                          <input
                            id="idProof"
                            name="idProof"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            className="hidden"
                            onChange={handleUploadIdProof}
                          />
                        </label>
                        <span className="text-sm text-gray-600">
                          {idProofFileName || 'No file selected'}
                        </span>
                      </div>
                      {fieldErrors.idProof && <p className="text-sm text-red-600">{fieldErrors.idProof}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name (optional if UPI provided)</Label>
                        <Input
                          id="bankName"
                          name="bankName"
                          value={formData.bankName}
                          onChange={(e) => updateField('bankName', e.target.value)}
                          placeholder="e.g. HDFC Bank"
                          className={fieldErrors.bankName ? 'border-red-500' : ''}
                        />
                        {fieldErrors.bankName && <p className="text-sm text-red-600">{fieldErrors.bankName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={(e) => updateField('accountNumber', e.target.value)}
                          placeholder="9 to 18 digit account number"
                          className={fieldErrors.accountNumber ? 'border-red-500' : ''}
                        />
                        {fieldErrors.accountNumber && (
                          <p className="text-sm text-red-600">{fieldErrors.accountNumber}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ifscCode">IFSC Code</Label>
                        <Input
                          id="ifscCode"
                          name="ifscCode"
                          value={formData.ifscCode}
                          onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                          placeholder="e.g. SBIN0001234"
                          className={fieldErrors.ifscCode ? 'border-red-500' : ''}
                        />
                        {fieldErrors.ifscCode && <p className="text-sm text-red-600">{fieldErrors.ifscCode}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="upiId">UPI ID</Label>
                        <Input
                          id="upiId"
                          name="upiId"
                          value={formData.upiId}
                          onChange={(e) => updateField('upiId', e.target.value)}
                          placeholder="e.g. farmer@upi"
                          className={fieldErrors.upiId ? 'border-red-500' : ''}
                        />
                        {fieldErrors.upiId && <p className="text-sm text-red-600">{fieldErrors.upiId}</p>}
                      </div>
                    </div>

                    {fieldErrors.paymentDetails && (
                      <p className="text-sm text-red-600">{fieldErrors.paymentDetails}</p>
                    )}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-white ${roleStyle.buttonClass}`}
              >
                {isSubmitting
                  ? effectiveMode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : effectiveMode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </Button>
            </form>

            {isCameraOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
                <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Capture Live Photo</h3>
                      <p className="text-sm text-gray-600">Keep the subject inside the square frame.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={closeCamera}>
                      Close
                    </Button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border bg-black">
                    <div className="relative aspect-square w-full">
                      <video
                        ref={cameraVideoRef}
                        className="h-full w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                      />
                      <div className="pointer-events-none absolute inset-0 border-2 border-white/80 ring-4 ring-emerald-500/30" />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={captureCameraPhoto}>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={closeCamera}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {role !== 'admin' && (
              <div className="text-center mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600 mb-2">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    onModeChange(mode === 'login' ? 'signup' : 'login');
                    setFieldErrors({});
                    setGeneralError('');
                  }}
                  className={roleStyle.linkClass}
                >
                  {mode === 'login' ? 'Create account' : 'Sign in instead'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedAuthForm;
