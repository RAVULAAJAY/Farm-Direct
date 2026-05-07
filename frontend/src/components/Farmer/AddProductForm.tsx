import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, X, MapPin, Navigation } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  unit: string;
  image: string;
  location: string;
  description: string;
  category: string;
  createdAt?: string | Date;
}

interface AddProductFormProps {
  onSubmit?: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialProduct?: Partial<Product> | null;
  submitLabel?: string;
  title?: string;
  description?: string;
}

const createInitialFormData = (initialProduct?: Partial<Product> | null) => ({
  name: initialProduct?.name ?? '',
  price: initialProduct?.price?.toString() ?? '',
  stock: (initialProduct?.stock ?? initialProduct?.quantity)?.toString() ?? '',
  unit: initialProduct?.unit ?? 'kg',
  image: initialProduct?.image ?? '',
  location: initialProduct?.location ?? '',
  description: initialProduct?.description ?? '',
  category: initialProduct?.category ?? 'vegetables'
});

const AddProductForm: React.FC<AddProductFormProps> = ({
  onSubmit,
  onCancel,
  initialProduct,
  submitLabel = 'Add Product',
  title = 'Add New Product',
  description = 'List a new product to sell on the marketplace'
}) => {
  const [formData, setFormData] = useState(createInitialFormData(initialProduct));

  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Array<{ name: string; dataUrl: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    setFormData(createInitialFormData(initialProduct));
    setPreview(initialProduct?.image ?? null);
    setUploadedImages(
      initialProduct?.image
        ? [
            {
              name: 'current-image',
              dataUrl: initialProduct.image,
            },
          ]
        : []
    );
    setErrors({});
  }, [initialProduct]);

  const categories = [
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'grains', label: 'Grains' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'milk', label: 'Milk' },
    { value: 'meat', label: 'Meat & Poultry' },
    { value: 'honey', label: 'Honey & Spices' },
    { value: 'organic', label: 'Organic Products' },
    { value: 'other', label: 'Other' }
  ];

  const units = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'gram', label: 'Gram (g)' },
    { value: 'liter', label: 'Liter (L)' },
    { value: 'piece', label: 'Piece' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'bunch', label: 'Bunch' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (formData.stock === '' || Number.isNaN(Number(formData.stock)) || parseInt(formData.stock, 10) < 0) {
      newErrors.stock = 'Valid stock is required';
    }
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!preview) newErrors.image = 'Product image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) {
      return;
    }

    const nextImages: Array<{ name: string; dataUrl: string }> = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, image: 'Only image files are allowed' }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Each image must be less than 5MB' }));
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      nextImages.push({ name: file.name, dataUrl });
    }

    setUploadedImages((prev) => {
      const merged = [...prev.filter((item) => item.name !== 'current-image'), ...nextImages].slice(0, 5);
      setPreview(merged[0]?.dataUrl ?? null);
      return merged;
    });

    setErrors((prev) => ({ ...prev, image: '' }));
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      setPreview(filtered[0]?.dataUrl ?? null);
      return filtered;
    });
  };

  const handleAutoTagLocation = async () => {
    setIsDetectingLocation(true);
    setErrors((prev) => ({ ...prev, location: '' }));

    try {
      const coords = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const latitude = coords.coords.latitude.toFixed(6);
      const longitude = coords.coords.longitude.toFixed(6);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Location lookup failed');
      }

      const data = (await response.json()) as { display_name?: string };
      const locationValue = data.display_name
        ? `${data.display_name} (${latitude}, ${longitude})`
        : `${latitude}, ${longitude}`;

      setFormData((prev) => ({ ...prev, location: locationValue }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        location: 'Could not auto-tag location. Please enter location manually.',
      }));
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const stock = Math.max(0, parseInt(formData.stock, 10));
      const resolvedImage = uploadedImages[0]?.dataUrl ?? preview ?? '';
      const product: Omit<Product, 'id' | 'createdAt'> = {
        name: formData.name,
        price: parseFloat(formData.price),
        stock,
        quantity: stock,
        unit: formData.unit,
        image: resolvedImage,
        location: formData.location,
        description: formData.description,
        category: formData.category
      };

      onSubmit?.(product);

      // Reset form
      setFormData(createInitialFormData(null));
      setPreview(null);
      setUploadedImages([]);
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <Label className="mb-2 block">Product Images *</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
              {preview ? (
                <div className="relative inline-flex flex-col items-center gap-3">
                  <div className="inline-block">
                    <img
                      src={preview}
                      alt="Preview"
                      className="h-48 w-48 object-cover rounded-lg"
                    />
                  </div>
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                      {uploadedImages.map((image, index) => (
                        <div key={`${image.name}-${index}`} className="relative">
                          <img
                            src={image.dataUrl}
                            alt={image.name}
                            className="h-16 w-full object-cover rounded-md border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                    Add more images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">Click to upload images</p>
                    <p className="text-xs text-gray-500">PNG/JPG/WebP up to 5MB each, max 5 images</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {errors.image && (
              <p className="text-red-500 text-sm mt-1">{errors.image}</p>
            )}
          </div>

          {/* Product Name */}
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Fresh Tomatoes"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Category and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit">Unit of Measurement *</Label>
              <Select value={formData.unit} onValueChange={(value) => handleSelectChange('unit', value)}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price per {formData.unit} (₹) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price}</p>
              )}
            </div>
            <div>
              <Label htmlFor="stock">Quantity Available *</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                placeholder="0"
                min="0"
                value={formData.stock}
                onChange={handleChange}
                className={errors.stock ? 'border-red-500' : ''}
              />
              {errors.stock && (
                <p className="text-red-500 text-sm mt-1">{errors.stock}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location of Farm/Store *</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="location"
                name="location"
                placeholder="e.g., Sector 45, Noida"
                value={formData.location}
                onChange={handleChange}
                className={errors.location ? 'border-red-500' : ''}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoTagLocation}
                disabled={isDetectingLocation}
                className="sm:w-auto"
              >
                {isDetectingLocation ? (
                  <>
                    <Navigation className="h-4 w-4 mr-2 animate-pulse" />
                    Tagging...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Auto-tag
                  </>
                )}
              </Button>
            </div>
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your product: quality, farming methods, special features, etc."
              rows={4}
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertDescription className="text-sm">
              Tip: Clear product descriptions with good images lead to more sales. Be specific about quality, origin, and any certifications.
            </AlertDescription>
          </Alert>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddProductForm;
