import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Award,
  Truck,
  Shield,
  Heart,
  Share2,
  MessageCircle,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Product } from '@/lib/data';
import { useGlobalState } from '@/context/GlobalStateContext';
import { useNavigate } from 'react-router-dom';

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  rating: number;
  reviews: number;
  totalSales: number;
  joinDate: string;
  certifications: string[];
  bio: string;
}

interface ProductDetailsPageProps {
  product: Product;
  farmer?: Partial<Farmer>;
  onBack?: () => void;
}

const categoryLabels: Record<string, string> = {
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  grains: 'Grains',
  dairy: 'Dairy',
  meat: 'Meat & Poultry',
  honey: 'Honey & Spices',
  organic: 'Organic',
  other: 'Other',
};

const categoryColors: Record<string, string> = {
  vegetables: 'bg-green-100 text-green-700',
  fruits: 'bg-red-100 text-red-700',
  grains: 'bg-yellow-100 text-yellow-700',
  dairy: 'bg-blue-100 text-blue-700',
  meat: 'bg-purple-100 text-purple-700',
  honey: 'bg-orange-100 text-orange-700',
  organic: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-700',
};

const ProductDetailsPage: React.FC<ProductDetailsPageProps> = ({
  product,
  farmer,
  onBack,
}) => {
  const navigate = useNavigate();
  const {
    currentUser,
    addToCart,
    isFavoriteProduct,
    toggleFavoriteProduct,
  } = useGlobalState();

  const [quantity, setQuantity] = useState(1);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [cartSuccess, setCartSuccess] = useState(false);

  const resolvedFarmer: Farmer = useMemo(() => ({
    id: farmer?.id ?? product.farmerId,
    name: farmer?.name ?? product.farmerName ?? 'Farmer',
    email: farmer?.email ?? 'farmer@example.com',
    phone: farmer?.phone ?? 'N/A',
    location: farmer?.location ?? product.location,
    rating: farmer?.rating ?? 4.5,
    reviews: farmer?.reviews ?? 0,
    totalSales: farmer?.totalSales ?? 0,
    joinDate: farmer?.joinDate ?? 'Recently joined',
    certifications: farmer?.certifications ?? [],
    bio: farmer?.bio ?? 'Local farmer on the platform.',
  }), [farmer, product]);

  const isFavorite = isFavoriteProduct(product.id);
  const listedDate = product.createdAt ?? product.harvestDate;
  const availableStock = product.stock ?? product.quantity;
  const productReviews = useMemo(
    () => [...(product.reviewEntries ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [product.reviewEntries]
  );

  const reviewStats = useMemo(() => {
    if (productReviews.length === 0) {
      return { average: Number(product.rating ?? 0), count: Number(product.reviews ?? 0) };
    }

    const sum = productReviews.reduce((total, review) => total + review.rating, 0);
    return {
      average: Number((sum / productReviews.length).toFixed(1)),
      count: productReviews.length,
    };
  }, [product.rating, product.reviews, productReviews]);

  const formatReviewDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const handleToggleFavorite = () => {
    toggleFavoriteProduct(product.id);
  };

  const handleAddToCart = () => {
    if (currentUser?.role !== 'buyer') {
      return;
    }

    addToCart(product.id, quantity);
    setCartSuccess(true);
    window.setTimeout(() => setCartSuccess(false), 1800);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const handleContactFarmer = () => {
    setShowContactDialog(false);
    setContactMessage('');
  };

  const handleChatWithFarmer = () => {
    const query = new URLSearchParams({
      partnerId: resolvedFarmer.id,
      productName: product.name,
      draft: `Hi ${resolvedFarmer.name}, I am interested in ${product.name}.`,
    });

    navigate(`/messages?${query.toString()}`);
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <button onClick={onBack} className="font-medium hover:text-gray-900">Back</button>
        <span>/</span>
        <span>{categoryLabels[product.category] ?? 'Other'}</span>
        <span>/</span>
        <span className="font-medium text-gray-900">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-gray-400">No image</div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleToggleFavorite}>
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                {isFavorite ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <Badge className={categoryColors[product.category] ?? categoryColors.other}>
              {categoryLabels[product.category] ?? 'Other'}
            </Badge>
            <h1 className="mt-2 text-4xl font-bold text-gray-900">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-5 w-5 ${
                      index < Math.floor(resolvedFarmer.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{resolvedFarmer.rating} ({resolvedFarmer.reviews} reviews)</span>
              <span className="text-sm text-gray-600">•</span>
              <span className="text-sm text-gray-600">{resolvedFarmer.totalSales} sales</span>
            </div>
          </div>

          <div className="border-b border-gray-200 pb-6">
            <div className="mb-4 flex items-end gap-2">
              <p className="text-5xl font-bold text-gray-900">₹{product.price.toFixed(2)}</p>
              <p className="mb-2 text-xl text-gray-600">/{product.unit}</p>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{product.location}</span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Farmer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Farmer Name</p>
                <p className="font-semibold text-gray-900">{resolvedFarmer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Farm Details</p>
                <p className="text-gray-800">{resolvedFarmer.bio}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="text-gray-900">{resolvedFarmer.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ratings</p>
                <p className="text-gray-900">{resolvedFarmer.rating} / 5 ({resolvedFarmer.reviews} reviews)</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button onClick={() => setShowContactDialog(true)} variant="outline" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contact Farmer
                </Button>
                <Button onClick={handleChatWithFarmer} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          {availableStock === 0 ? (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>This product is currently out of stock</AlertDescription>
            </Alert>
          ) : availableStock <= 10 ? (
            <Alert className="bg-orange-50 border-orange-200 text-orange-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Only {availableStock} units available. Order now!</AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{availableStock} units in stock - Free delivery on orders above ₹500</AlertDescription>
            </Alert>
          )}

          {cartSuccess && (
            <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{product.name} was added to your cart.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 rounded-lg bg-gray-50 p-6">
            <div>
              <Label className="mb-3 block">Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={availableStock === 0}
                >
                  −
                </Button>
                <span className="w-16 text-center text-2xl font-bold">{quantity}</span>
                <Button
                  variant="outline"
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  disabled={quantity >= availableStock || availableStock === 0}
                >
                  +
                </Button>
                <span className="ml-auto text-sm text-gray-600">{product.unit}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={availableStock === 0}
                className="w-full gap-2 bg-green-600 py-6 text-lg text-white hover:bg-green-700"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart (₹{(product.price * quantity).toFixed(2)})
              </Button>
              <Button
                onClick={handleBuyNow}
                variant="outline"
                className="w-full gap-2 py-6 text-lg"
                disabled={availableStock === 0}
              >
                <Truck className="h-5 w-5" />
                Buy Now via Checkout
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Why Choose This Product?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Certified Quality</p>
                    <p className="text-sm text-gray-600">Direct from verified farmer</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Fast Delivery</p>
                    <p className="text-sm text-gray-600">Estimated 1-2 days delivery</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Award className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Fresh Guarantee</p>
                    <p className="text-sm text-gray-600">Harvested within 24 hours</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="description" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="farmer">Farmer Profile</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviewStats.count})</TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="mb-1 text-sm text-gray-600">Category</p>
                  <p className="font-semibold text-gray-900">{categoryLabels[product.category] ?? 'Other'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-600">Price per {product.unit}</p>
                  <p className="font-semibold text-gray-900">₹{product.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-600">Available Quantity</p>
                  <p className="font-semibold text-gray-900">{availableStock} {product.unit}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-600">Listed On</p>
                  <p className="font-semibold text-gray-900">{new Date(listedDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Description</h3>
                <p className="leading-relaxed text-gray-700">{product.description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="farmer">
          <Card>
            <CardHeader>
              <CardTitle>Farmer Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between border-b pb-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">🧑‍🌾</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{resolvedFarmer.name}</h3>
                    <p className="mt-1 text-gray-600">Verified Organic Farmer</p>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < Math.floor(resolvedFarmer.rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{resolvedFarmer.rating}/5.0</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="mb-1 text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{resolvedFarmer.totalSales}+</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-600">Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{resolvedFarmer.reviews}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-600">Member Since</p>
                  <p className="text-sm font-bold text-gray-900">{resolvedFarmer.joinDate}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{resolvedFarmer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{resolvedFarmer.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{resolvedFarmer.location}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-gray-900">About</h4>
                <p className="text-gray-700">{resolvedFarmer.bio}</p>
              </div>

              <div>
                <h4 className="mb-3 font-semibold text-gray-900">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {resolvedFarmer.certifications.map((cert, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      <Award className="h-3 w-3" />
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Button onClick={() => setShowContactDialog(true)} variant="outline" className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contact Farmer
                </Button>
                <Button onClick={handleChatWithFarmer} className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <MessageCircle className="h-4 w-4" />
                  Chat with Farmer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Customer Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 rounded-2xl bg-gray-50 p-4 sm:grid-cols-[auto,1fr] sm:items-center">
                <div>
                  <p className="text-4xl font-bold text-gray-900">{reviewStats.average.toFixed(1)}</p>
                  <p className="mt-2 text-sm text-gray-600">Based on {reviewStats.count} review{reviewStats.count === 1 ? '' : 's'}</p>
                </div>
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = productReviews.filter((review) => Math.round(review.rating) === rating).length;
                    const percentage = reviewStats.count > 0 ? (count / reviewStats.count) * 100 : 0;

                    return (
                      <div key={rating} className="flex items-center gap-2 text-sm">
                        <span className="w-10 text-gray-600">{rating}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="w-8 text-right text-gray-600">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {productReviews.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <p className="text-sm font-medium text-gray-900">No reviews yet</p>
                  <p className="mt-1 text-sm text-gray-500">Reviews and comments will appear here after buyers submit feedback.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {productReviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{review.userName}</p>
                          <p className="text-sm text-gray-600">{review.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`h-4 w-4 ${index < Math.round(review.rating) ? 'fill-current' : ''}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{review.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-gray-700">{review.content}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{formatReviewDate(review.timestamp)}</span>
                        {review.purchaseVerified && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">Verified purchase</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {resolvedFarmer.name}</DialogTitle>
            <DialogDescription>Send a message to the farmer about this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your Name</Label>
              <Input placeholder="Enter your name" className="mt-2" />
            </div>
            <div>
              <Label>Your Email</Label>
              <Input placeholder="Enter your email" type="email" className="mt-2" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input placeholder="Enter your phone" className="mt-2" />
            </div>
            <div>
              <Label>Message</Label>
              <textarea
                placeholder="Ask about the product, bulk orders, or anything else..."
                rows={4}
                value={contactMessage}
                onChange={(event) => setContactMessage(event.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleContactFarmer} className="flex-1 bg-green-600 hover:bg-green-700">
                Send Message
              </Button>
              <Button onClick={() => setShowContactDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetailsPage;
