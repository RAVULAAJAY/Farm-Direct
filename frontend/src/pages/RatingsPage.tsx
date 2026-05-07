import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingBag, MessageSquare, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

type FarmerReviewItem = {
  id: string;
  buyerName: string;
  rating: number;
  comment: string;
  productName: string;
  timestamp: string;
};

const RatingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { products, orders, messages, notifications } = useGlobalState();

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
    const totalReviews = farmerProducts.reduce((sum, product) => sum + (product.reviews ?? 0), 0);
    const weightedRating = farmerProducts.reduce(
      (sum, product) => sum + (product.rating ?? 0) * (product.reviews ?? 0),
      0
    );
    const averageRating = totalReviews > 0 ? weightedRating / totalReviews : 0;

    return {
      totalReviews,
      averageRating,
    };
  }, [farmerProducts]);

  const farmerReviewItems = useMemo<FarmerReviewItem[]>(() => {
    if (!currentUser || currentUser.role !== 'farmer') {
      return [];
    }

    const feedbackMessagePattern =
      /^Rating feedback for order #(.+?) \((.+?)\):\s*(\d(?:\.\d+)?)\/5 stars\.\s*(.*)$/i;
    const ratingNotificationPattern = /^(.*?) rated (.*?) (\d(?:\.\d+)?)\/5\./i;
    const items: FarmerReviewItem[] = [];

    const feedbackMessages = messages
      .filter((entry) => entry.recipientId === currentUser.id)
      .filter((entry) => entry.content.startsWith('Rating feedback for order #'));

    for (const entry of feedbackMessages) {
      const match = entry.content.match(feedbackMessagePattern);
      if (!match) {
        continue;
      }

      const [, , productName, ratingRaw, comment] = match;
      const parsedRating = Number(ratingRaw);
      const safeRating = Number.isFinite(parsedRating)
        ? Math.max(1, Math.min(5, parsedRating))
        : 0;

      items.push({
        id: `message-${entry.id}`,
        buyerName: entry.senderName,
        rating: safeRating,
        comment: comment.trim() || 'No written comment provided.',
        productName,
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
      items.push({
        id: `notification-${entry.id}`,
        buyerName,
        rating: safeRating,
        comment: 'Buyer submitted a star rating without a written comment.',
        productName,
        timestamp: entry.timestamp,
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentUser, messages, notifications]);

  const formatReviewDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

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

        <Card>
          <CardHeader>
            <CardDescription>Total Buyer Reviews</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{feedbackStats.totalReviews}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Aggregated across all your product listings.</p>
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
                  className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
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
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
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
    </div>
  );
};

export default RatingsPage;
