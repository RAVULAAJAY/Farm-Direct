import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Star, ShoppingBag, MessageSquare, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

type FarmerReviewItem = {
  id: string;
  buyerName: string;
  buyerId?: string;
  rating: number;
  comment: string;
  productName: string;
  productId?: string;
  orderId?: string;
  timestamp: string;
};

type ReviewerSummaryItem = {
  buyerId?: string;
  buyerName: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  ratingCount: number;
  averageRating: number;
  latestReviewDate: string;
  latestProductName: string;
};

const RatingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users, products, orders, messages, notifications } = useGlobalState();

  const farmerProducts = useMemo(() => {
    if (!currentUser || currentUser.role !== 'farmer') {
      return [];
    }

    return products.filter((product) => product.farmerId === currentUser.id);
  }, [currentUser, products]);

  const buyerDeliveredOrders = useMemo(() => {
    if (!currentUser || currentUser.role !== 'buyer') {
      return [];
    }

    return orders
      .filter((order) => order.buyerId === currentUser.id)
      .filter((order) => order.status === 'delivered')
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [currentUser, orders]);

  const feedbackStats = useMemo(() => {
    const totalReviews = farmerProducts.reduce(
      (sum, product) => sum + (product.reviewEntries?.length ?? product.reviews ?? 0),
      0
    );
    const weightedRating = farmerProducts.reduce((sum, product) => {
      const reviews = product.reviewEntries ?? [];
      if (reviews.length > 0) {
        return sum + reviews.reduce((innerSum, review) => innerSum + review.rating, 0);
      }
      return sum + (product.rating ?? 0) * (product.reviews ?? 0);
    }, 0);
    const averageRating = totalReviews > 0 ? weightedRating / totalReviews : 0;

    return {
      totalReviews,
      averageRating,
    };
  }, [farmerProducts]);

  const [selectedReview, setSelectedReview] = useState<FarmerReviewItem | null>(null);
  const [showReviewersDialog, setShowReviewersDialog] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<ReviewerSummaryItem | null>(null);

  const farmerReviewItems = useMemo<FarmerReviewItem[]>(() => {
    if (!currentUser || currentUser.role !== 'farmer') {
      return [];
    }

    const items: FarmerReviewItem[] = [];

    // Include review entries from farmer products so reviews show up even if no message notification exists.
    for (const product of farmerProducts) {
      const reviewEntries = product.reviewEntries ?? [];
      for (const review of reviewEntries) {
        items.push({
          id: `product-review-${product.id}-${review.id}`,
          buyerName: review.userName,
          buyerId: review.userId,
          rating: review.rating,
          comment: review.content || review.title || 'No written comment provided.',
          productName: product.name,
          productId: product.id,
          orderId: undefined,
          timestamp: review.timestamp,
        });
      }
    }

    const feedbackMessagePattern =
      /^Rating feedback for order #(.+?) \((.+?)\):\s*(\d(?:\.\d+)?)\/5 stars\.\s*(.*)$/i;
    const ratingNotificationPattern = /^(.*?) rated (.*?) (\d(?:\.\d+)?)\/5\./i;

    const feedbackMessages = messages
      .filter((entry) => entry.recipientId === currentUser.id)
      .filter((entry) => entry.content.startsWith('Rating feedback for order #'));

    for (const entry of feedbackMessages) {
      const match = entry.content.match(feedbackMessagePattern);
      if (!match) {
        continue;
      }

      const [_, orderId, productName, ratingRaw, comment] = match;
      const parsedRating = Number(ratingRaw);
      const safeRating = Number.isFinite(parsedRating)
        ? Math.max(1, Math.min(5, parsedRating))
        : 0;

      const order = orders.find((orderItem) => orderItem.id === orderId);
      const productId = order?.productId;
      const buyerId = entry.senderId;

      items.push({
        id: `message-${entry.id}`,
        buyerName: entry.senderName,
        buyerId,
        rating: safeRating,
        comment: comment.trim() || 'No written comment provided.',
        productName: order?.productName ?? productName,
        productId,
        orderId,
        timestamp: entry.timestamp,
      });
    }

    const seenSignatures = new Set(
      items.map(
        (entry) =>
          `${entry.buyerName.toLowerCase()}|${entry.productName.toLowerCase()}|${entry.rating.toFixed(1)}`
      )
    );

    const ratingNotifications = notifications
      .filter((entry) => entry.userId === currentUser.id && entry.title === 'New buyer rating received')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    for (const entry of ratingNotifications) {
      const match = entry.message.match(ratingNotificationPattern);
      if (!match) {
        continue;
      }

      const [, buyerName, productName, ratingRaw] = match;
      const parsedRating = Number(ratingRaw);
      const safeRating = Number.isFinite(parsedRating)
        ? Math.max(1, Math.min(5, parsedRating))
        : 0;
      const signature = `${buyerName.toLowerCase()}|${productName.toLowerCase()}|${safeRating.toFixed(1)}`;

      if (seenSignatures.has(signature)) {
        continue;
      }

      seenSignatures.add(signature);
      const product = products.find((item) => item.name === productName && item.farmerId === currentUser.id);
      const buyer = users.find((user) => user.name === buyerName && user.role === 'buyer');

      items.push({
        id: `notification-${entry.id}`,
        buyerName,
        buyerId: buyer?.id,
        rating: safeRating,
        comment: 'Buyer submitted a star rating without a written comment.',
        productName,
        productId: product?.id,
        timestamp: entry.timestamp,
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentUser, farmerProducts, messages, notifications, orders, products, users]);

  const reviewerSummary = useMemo<ReviewerSummaryItem[]>(() => {
    const summaryMap = new Map<string, ReviewerSummaryItem>();

    for (const review of farmerReviewItems) {
      const key = review.buyerId ?? review.buyerName.toLowerCase();
      const existing = summaryMap.get(key);
      const buyerUser = users.find((user) => user.id === review.buyerId) ??
        users.find((user) => user.name === review.buyerName && user.role === 'buyer');

      const nextItem: ReviewerSummaryItem = {
        buyerId: review.buyerId,
        buyerName: review.buyerName,
        user: buyerUser
          ? {
              id: buyerUser.id,
              name: buyerUser.name,
              email: buyerUser.email,
              phone: buyerUser.phone,
              location: buyerUser.location,
            }
          : undefined,
        ratingCount: (existing?.ratingCount ?? 0) + 1,
        averageRating:
          ((existing?.averageRating ?? 0) * (existing?.ratingCount ?? 0) + review.rating) /
          ((existing?.ratingCount ?? 0) + 1),
        latestReviewDate:
          !existing || new Date(review.timestamp) > new Date(existing.latestReviewDate)
            ? review.timestamp
            : existing.latestReviewDate,
        latestProductName:
          !existing || new Date(review.timestamp) > new Date(existing.latestReviewDate)
            ? review.productName
            : existing.latestProductName,
      };

      summaryMap.set(key, nextItem);
    }

    return Array.from(summaryMap.values()).sort((a, b) => b.ratingCount - a.ratingCount);
  }, [farmerReviewItems, users]);

  const formatReviewDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const selectedOrder = selectedReview
    ? orders.find((order) => order.id === selectedReview.orderId)
    : undefined;

  const selectedProduct = selectedReview
    ? products.find((product) => product.id === selectedReview.productId) ??
      products.find((product) => product.id === selectedOrder?.productId) ??
      products.find((product) => product.name === selectedReview.productName)
    : undefined;

  const selectedBuyer = selectedReview
    ? users.find((user) => user.id === selectedReview.buyerId) ??
      users.find((user) => user.id === selectedOrder?.buyerId) ??
      users.find((user) => user.name === selectedReview.buyerName && user.role === 'buyer')
    : undefined;

  const getReviewOwner = (review: FarmerReviewItem) => {
    if (review.buyerId) {
      return users.find((user) => user.id === review.buyerId);
    }

    return users.find((user) => user.name === review.buyerName && user.role === 'buyer');
  };

  if (!currentUser) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">Please log in to view ratings.</p>
      </Card>
    );
  }

  if (currentUser.role === 'buyer') {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ratings & Reviews</h1>
          <p className="mt-2 text-gray-600">
            Review the products you have received and jump back to any listing to leave feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Delivered Orders</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{buyerDeliveredOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Products Available to Review</p>
              <p className="mt-1 text-3xl font-bold text-blue-600">{buyerDeliveredOrders.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">Quick Action</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">Open a product and add your review</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Delivered Purchases</CardTitle>
            <CardDescription>Open a product to read reviews and share your own experience.</CardDescription>
          </CardHeader>
          <CardContent>
            {buyerDeliveredOrders.length > 0 ? (
              <div className="space-y-3">
                {buyerDeliveredOrders.map((order) => {
                  const product = products.find((entry) => entry.id === order.productId);

                  return (
                    <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-gray-500" />
                          <p className="font-semibold text-gray-900">{order.productName}</p>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">Farmer: {order.farmerName}</p>
                        {product ? (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                            <Badge variant="secondary">{product.reviews ?? 0} reviews</Badge>
                            <span className="flex items-center gap-1 text-amber-600">
                              <Star className="h-4 w-4 fill-current" />
                              {(product.rating ?? 0).toFixed(1)} / 5
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button variant="outline" onClick={() => navigate(`/product/${order.productId}`)}>
                          Open Product
                        </Button>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/product/${order.productId}`)}>
                          <MessageSquare className="h-4 w-4" />
                          Review Now
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <ShoppingBag className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No delivered orders yet. Once your orders arrive, you can review them here.</p>
                <Button className="mt-3" onClick={() => navigate('/browse')}>
                  Browse Marketplace
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ratings & Buyer Feedback</h1>
        <p className="text-gray-600 mt-2">Track how buyers rate your listings and identify products that need improvement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Average Rating</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {feedbackStats.averageRating > 0 ? feedbackStats.averageRating.toFixed(1) : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, index) => {
                const filled = feedbackStats.averageRating >= index + 1;
                return <Star key={index} className={`h-4 w-4 ${filled ? 'fill-current' : ''}`} />;
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer" onClick={() => setShowReviewersDialog(true)}>
          <CardHeader>
            <CardDescription>Total Buyer Reviews</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{feedbackStats.totalReviews}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Aggregated across all your product listings. Click to see buyers who submitted ratings.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product-wise Feedback</CardTitle>
          <CardDescription>Ratings and review counts for each listing.</CardDescription>
        </CardHeader>
        <CardContent>
          {farmerProducts.length === 0 ? (
            <p className="text-sm text-gray-600">No listings found yet. Add products to start receiving buyer feedback.</p>
          ) : (
            <div className="space-y-3">
              {farmerProducts.map((product) => (
                <div
                  key={product.id}
                  className="cursor-pointer flex flex-col gap-2 rounded-lg border p-4 transition hover:border-blue-300 md:flex-row md:items-center md:justify-between"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">Category: {product.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{product.reviews ?? 0} reviews</Badge>
                    <div className="flex items-center gap-1 text-amber-600 font-semibold">
                      <Star className="h-4 w-4 fill-current" />
                      {(product.rating ?? 0).toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Buyer Reviews</CardTitle>
          <CardDescription>Live feedback submitted by buyers from delivered orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {farmerReviewItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-3 text-sm text-gray-600">
                No buyer reviews yet. Ratings and comments will appear here once buyers submit feedback.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {farmerReviewItems.map((review) => (
                <article
                  key={review.id}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => setSelectedReview(review)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold tracking-tight text-gray-900">{review.buyerName}</h3>
                      <p className="text-sm text-gray-600">Reviewed {review.productName}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                        {review.rating.toFixed(1)} / 5
                      </Badge>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const filled = index < Math.round(review.rating);
                          return <Star key={index} className={`h-4 w-4 ${filled ? 'fill-current' : ''}`} />;
                        })}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-gray-800">{review.comment}</p>

                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">
                    {formatReviewDate(review.timestamp)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedReview)} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              View the product and buyer profile connected to this feedback.
            </DialogDescription>
          </DialogHeader>

          {selectedReview ? (
            <div className="space-y-6 py-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Product</p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">{selectedProduct?.name ?? selectedReview.productName}</h3>
                    {selectedProduct?.category && (
                      <p className="text-sm text-gray-600">Category: {selectedProduct.category}</p>
                    )}
                    {selectedProduct?.price != null && (
                      <p className="text-sm text-gray-600">Price: ₹{selectedProduct.price}</p>
                    )}
                    {selectedReview.orderId && (
                      <p className="text-sm text-gray-600 mt-2">Order: #{selectedReview.orderId}</p>
                    )}
                  </div>
                  {selectedProduct?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 sm:mt-0"
                      onClick={() => {
                        navigate(`/product/${selectedProduct.id}`);
                      }}
                    >
                      Open Product Page
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
                    {selectedBuyer?.name?.charAt(0).toUpperCase() ?? selectedReview.buyerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-gray-900">{selectedBuyer?.name ?? selectedReview.buyerName}</p>
                    {selectedBuyer?.location && (
                      <p className="text-sm text-gray-600">{selectedBuyer.location}</p>
                    )}
                    {selectedBuyer?.email && (
                      <p className="text-sm text-gray-600">{selectedBuyer.email}</p>
                    )}
                    {selectedBuyer?.phone && (
                      <p className="text-sm text-gray-600">{selectedBuyer.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Review</p>
                <h4 className="mt-2 text-lg font-semibold text-gray-900">{selectedReview.rating.toFixed(1)} / 5</h4>
                <p className="mt-2 text-sm leading-7 text-gray-700">{selectedReview.comment}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewersDialog} onOpenChange={(open) => {
        if (!open) {
          setShowReviewersDialog(false);
          setSelectedReviewer(null);
        }
      }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reviewers</DialogTitle>
            <DialogDescription>
              Buyers who submitted feedback on your products. Click a reviewer name to view their profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {reviewerSummary.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No buyer reviews have been submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {reviewerSummary.map((reviewer) => (
                  <div key={reviewer.buyerId ?? reviewer.buyerName} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <button
                          type="button"
                          className="text-left text-base font-semibold text-blue-700 hover:underline"
                          onClick={() => setSelectedReviewer(reviewer)}
                        >
                          {reviewer.buyerName}
                        </button>
                        <p className="text-sm text-gray-600">
                          {reviewer.ratingCount} review{reviewer.ratingCount === 1 ? '' : 's'}, latest on {formatReviewDate(reviewer.latestReviewDate)}
                        </p>
                        <p className="text-sm text-gray-600">Latest product: {reviewer.latestProductName}</p>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{reviewer.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedReviewer ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-gray-500">Reviewer Profile</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
                    {selectedReviewer.buyerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">{selectedReviewer.buyerName}</p>
                    {selectedReviewer.user?.location && (
                      <p className="text-sm text-gray-600">{selectedReviewer.user.location}</p>
                    )}
                    {selectedReviewer.user?.email && (
                      <p className="text-sm text-gray-600">{selectedReviewer.user.email}</p>
                    )}
                    {selectedReviewer.user?.phone && (
                      <p className="text-sm text-gray-600">{selectedReviewer.user.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RatingsPage;
