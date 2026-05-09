import React, { useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Printer, X, MapPin, Package, Truck, CreditCard, ReceiptText, Store, UserCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BrandLogo from '@/components/BrandLogo';
import { Order, Product } from '@/lib/data';
import { User } from '@/context/GlobalStateContext';

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  buyer?: User | null;
  farmer?: User | null;
  product?: Product | null;
}

const currencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormat.format(value);

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatDeliveryMethod = (method: Order['deliveryOption']) => (method === 'pickup' ? 'Pickup' : 'Delivery');

const formatDeliveryStatus = (status: Order['deliveryStatus']) => {
  if (status === 'ready-for-pickup') {
    return 'Ready for Pickup';
  }

  if (status === 'out-for-delivery') {
    return 'Out for Delivery';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatPaymentStatus = (order: Order) => {
  if (order.paymentStatus === 'paid') {
    return 'Paid';
  }

  if (order.paymentStatus === 'refunded') {
    return 'Refunded';
  }

  if (order.paymentStatus === 'failed') {
    return 'Failed';
  }

  if (order.paymentStatus === 'pending') {
    return order.paymentMethod === 'cod' ? 'Cash on Delivery Pending' : 'Payment Pending';
  }

  if (order.status === 'delivered' || order.paidAmount !== undefined || order.paymentReference) {
    return 'Paid';
  }

  return order.paymentMethod === 'cod' ? 'Cash on Delivery Pending' : 'Payment Pending';
};

const getPaymentTone = (status: string) => {
  if (status === 'Paid') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (status === 'Refunded') {
    return 'bg-violet-50 text-violet-700 border-violet-200';
  }

  if (status === 'Failed') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const loadImageAsDataUrl = async (src: string): Promise<string | undefined> => {
  try {
    const response = await fetch(src);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read image data'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
};

const InvoiceModal: React.FC<InvoiceModalProps> = ({ open, onOpenChange, order, buyer, farmer, product }) => {
  const invoiceDateTime = useMemo(() => formatDateTime(order?.createdAt ?? order?.orderDate), [order?.createdAt, order?.orderDate]);

  const paymentStatus = useMemo(() => {
    if (!order) {
      return 'Pending';
    }

    return formatPaymentStatus(order);
  }, [order]);

  const deliveryDetails = useMemo(() => {
    if (!order) {
      return 'Not available';
    }

    const deliveryLine = order.deliveryOption === 'pickup'
      ? order.pickupLocation || 'Pick up at the designated farm gate'
      : order.deliveryAddress || 'Delivery address not provided';

    return `${formatDeliveryMethod(order.deliveryOption)} · ${formatDeliveryStatus(order.deliveryStatus)} · ${deliveryLine}`;
  }, [order]);

  const generatePdf = useCallback(async () => {
    if (!order) {
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const logoData = await loadImageAsDataUrl('/brand%20logo.png');

    pdf.setFillColor(16, 99, 47);
    pdf.rect(0, 0, pageWidth, 36, 'F');
    pdf.setFillColor(21, 128, 61);
    pdf.rect(0, 0, pageWidth, 8, 'F');

    if (logoData) {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 8, 20, 20, 5, 5, 'F');
      pdf.addImage(logoData, 'PNG', margin + 1.8, 9.8, 16.4, 16.4, undefined, 'FAST');
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('FarmDirect', margin + 26, 16);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Professional invoice', margin + 26, 24);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('INVOICE', pageWidth - margin, 16, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(invoiceDateTime, pageWidth - margin, 24, { align: 'right' });

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(`Order #${order.id}`, margin, 48);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Generated for ${buyer?.name ?? order.buyerName} and ${farmer?.name ?? order.farmerName}`, margin, 55);

    autoTable(pdf, {
      startY: 62,
      tableWidth: contentWidth,
      head: [['Item', 'Quantity', 'Unit Price', 'Amount']],
      body: [[
        product?.name ?? order.productName,
        String(order.quantity),
        formatCurrency(order.totalPrice / Math.max(order.quantity, 1)),
        formatCurrency(order.totalPrice),
      ]],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 4,
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 74 },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 36, halign: 'right' },
        3: { cellWidth: 36, halign: 'right' },
      },
    });

    const tableEndY = (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 75;
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = tableEndY + 6;
    const colWidth = (contentWidth - 4) / 2;

    // Helper to draw info cards with wrapped text
    const drawCard = (x: number, y: number, w: number, title: string, items: Array<{ l: string; v: string }>) => {
      const gapY = 4;
      const padY = 2.5;
      let h = 10;
      const lineH = 4;
      items.forEach((item) => {
        const wrapped = pdf.splitTextToSize(item.v, w - 8);
        h += Math.max(3.5, wrapped.length * lineH) + gapY;
      });

      // Card background
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, y, w, h, 2, 2, 'FD');

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(21, 128, 61);
      pdf.text(title, x + 3, y + 5);

      let itemY = y + 9;
      items.forEach((item) => {
        // Label
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(item.l, x + 3, itemY);

        // Value with wrapping
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(15, 23, 42);
        const wrapped = pdf.splitTextToSize(item.v, w - 8);
        pdf.text(wrapped, x + 3, itemY + 3.2);

        itemY += Math.max(3.5, wrapped.length * lineH) + gapY;
      });

      return y + h;
    };

    // Two-column layout for details
    let leftY = currentY;
    let rightY = currentY;

    // Left column
    leftY = drawCard(margin, leftY, colWidth, 'Order Summary', [
      { l: 'Amount', v: formatCurrency(order.totalPrice) },
      { l: 'Quantity', v: String(order.quantity) },
      { l: 'Payment', v: paymentStatus },
      { l: 'Delivery', v: formatDeliveryStatus(order.deliveryStatus) },
    ]);

    // Right column
    rightY = drawCard(margin + colWidth + 4, rightY, colWidth, 'Buyer Details', [
      { l: 'Name', v: buyer?.name ?? order.buyerName },
      { l: 'Email', v: buyer?.email ?? 'N/A' },
      { l: 'Phone', v: buyer?.phone ?? 'N/A' },
    ]);

    currentY = Math.max(leftY, rightY) + 5;

    // Farmer section
    leftY = currentY;
    rightY = currentY;

    leftY = drawCard(margin, leftY, colWidth, 'Farmer Details', [
      { l: 'Name', v: farmer?.name ?? order.farmerName },
      { l: 'Email', v: farmer?.email ?? 'N/A' },
      { l: 'Phone', v: farmer?.phone ?? 'N/A' },
    ]);

    rightY = drawCard(margin + colWidth + 4, rightY, colWidth, 'Delivery & Payment', [
      { l: 'Method', v: formatDeliveryMethod(order.deliveryOption) },
      { l: 'Status', v: formatDeliveryStatus(order.deliveryStatus) },
      { l: 'Payment', v: order.paymentMethod?.toUpperCase() ?? 'N/A' },
    ]);

    currentY = Math.max(leftY, rightY) + 4;

    // Full-width locations (if needed)
    const buyerLoc = buyer?.location ?? 'Not provided';
    const farmerLoc = farmer?.location ?? 'Not provided';
    if (buyerLoc.length > 35 || farmerLoc.length > 35) {
      currentY = drawCard(margin, currentY, contentWidth, 'Locations', [
        { l: 'Buyer', v: buyerLoc },
        { l: 'Farmer', v: farmerLoc },
      ]);
    }

    // Footer
    const footerY = Math.max(pageHeight - 28, currentY + 4);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, footerY, pageWidth - margin, footerY);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Grand Total', margin, footerY + 7);
    pdf.setFontSize(15);
    pdf.setTextColor(21, 128, 61);
    pdf.text(formatCurrency(order.totalPrice), pageWidth - margin, footerY + 7, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Professional FarmDirect order invoice', margin, footerY + 15);
    pdf.text(`${new Date().toLocaleString()}`, pageWidth - margin, footerY + 15, { align: 'right' });

    pdf.save(`FarmDirect_invoice_${order.id}.pdf`);
  }, [buyer?.name, buyer?.email, buyer?.phone, buyer?.location, farmer?.name, farmer?.email, farmer?.phone, farmer?.location, order, paymentStatus, product?.name, invoiceDateTime]);

  const handlePrint = useCallback(() => {
    if (!order) {
      return;
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!popup) {
      return;
    }

    const logoSrc = '/brand%20logo.png';
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>FarmDirect Invoice ${order.id}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: #f8fafc;
              color: #0f172a;
            }
            .page {
              max-width: 920px;
              margin: 0 auto;
              padding: 24px;
            }
            .sheet {
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
            }
            .header {
              background: linear-gradient(135deg, #10632f 0%, #16a34a 100%);
              color: white;
              padding: 24px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 14px;
              margin-bottom: 18px;
            }
            .brand img {
              width: 48px;
              height: 48px;
              background: white;
              border-radius: 14px;
              padding: 6px;
              object-fit: contain;
            }
            .title-row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              flex-wrap: wrap;
            }
            .muted { color: rgba(255,255,255,0.86); }
            .content { padding: 24px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 16px;
              background: #f8fafc;
            }
            .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #16a34a; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e2e8f0; align-items: flex-start; }
            .row:last-child { border-bottom: 0; }
            .label { color: #64748b; font-size: 13px; flex-shrink: 0; }
            .value { color: #0f172a; font-weight: 600; font-size: 13px; text-align: right; max-width: 68%; overflow-wrap: anywhere; word-break: break-word; }
            .summary { margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
            .total { font-size: 22px; font-weight: 800; color: #166534; text-align: right; }
            .table { width: 100%; border-collapse: collapse; margin-top: 16px; table-layout: fixed; }
            .table th, .table td { border: 1px solid #e2e8f0; padding: 12px; font-size: 13px; overflow-wrap: anywhere; word-break: break-word; vertical-align: top; }
            .table th { background: #ecfdf5; text-align: left; }
            .footer { padding: 0 24px 24px; color: #64748b; font-size: 12px; }
            @media print {
              body { background: white; }
              .page { padding: 0; max-width: none; }
              .sheet { border: 0; border-radius: 0; box-shadow: none; }
              .grid { grid-template-columns: 1fr; }
              .content { padding: 20px; }
              .header { padding: 20px; }
            }
            @media (max-width: 720px) {
              .grid { grid-template-columns: 1fr; }
              .title-row { flex-direction: column; }
              .row { flex-direction: column; gap: 4px; }
              .value { text-align: left; max-width: none; }
              .summary { flex-direction: column; align-items: flex-start; }
              .total { text-align: left; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="sheet">
              <div class="header">
                <div class="brand">
                  <img src="${logoSrc}" alt="FarmDirect logo" />
                  <div>
                    <div style="font-size: 24px; font-weight: 800; line-height: 1;">FarmDirect</div>
                    <div class="muted" style="margin-top: 4px; font-size: 13px;">Professional invoice</div>
                  </div>
                </div>
                <div class="title-row">
                  <div>
                    <div style="font-size: 13px; text-transform: uppercase; letter-spacing: .08em; opacity: .85;">Invoice</div>
                    <div style="font-size: 28px; font-weight: 800; margin-top: 6px; line-height: 1.15;">Order #${order.id}</div>
                    <div class="muted" style="margin-top: 8px;">${invoiceDateTime}</div>
                  </div>
                  <div style="text-align: right;">
                    <div class="muted">Payment Status</div>
                    <div style="font-size: 18px; font-weight: 700; margin-top: 6px;">${paymentStatus}</div>
                  </div>
                </div>
              </div>

              <div class="content">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${product?.name ?? order.productName}</td>
                      <td>${order.quantity}</td>
                      <td>${formatCurrency(order.totalPrice / Math.max(order.quantity, 1))}</td>
                      <td>${formatCurrency(order.totalPrice)}</td>
                    </tr>
                  </tbody>
                </table>

                <div class="grid" style="margin-top: 18px;">
                  <div class="card">
                    <div class="section-title">Buyer Details</div>
                    <div class="row"><span class="label">Name</span><span class="value">${buyer?.name ?? order.buyerName}</span></div>
                    <div class="row"><span class="label">Email</span><span class="value">${buyer?.email ?? 'Not provided'}</span></div>
                    <div class="row"><span class="label">Phone</span><span class="value">${buyer?.phone ?? 'Not provided'}</span></div>
                    <div class="row"><span class="label">Location</span><span class="value">${buyer?.location ?? 'Not provided'}</span></div>
                  </div>
                  <div class="card">
                    <div class="section-title">Farmer Details</div>
                    <div class="row"><span class="label">Name</span><span class="value">${farmer?.name ?? order.farmerName}</span></div>
                    <div class="row"><span class="label">Email</span><span class="value">${farmer?.email ?? 'Not provided'}</span></div>
                    <div class="row"><span class="label">Phone</span><span class="value">${farmer?.phone ?? 'Not provided'}</span></div>
                    <div class="row"><span class="label">Location</span><span class="value">${farmer?.location ?? 'Not provided'}</span></div>
                  </div>
                  <div class="card">
                    <div class="section-title">Delivery Details</div>
                    <div class="row"><span class="label">Method</span><span class="value">${formatDeliveryMethod(order.deliveryOption)}</span></div>
                    <div class="row"><span class="label">Status</span><span class="value">${formatDeliveryStatus(order.deliveryStatus)}</span></div>
                    <div class="row"><span class="label">Address / Pickup</span><span class="value">${order.deliveryOption === 'pickup' ? (order.pickupLocation ?? 'Not provided') : (order.deliveryAddress ?? 'Not provided')}</span></div>
                  </div>
                  <div class="card">
                    <div class="section-title">Payment Details</div>
                    <div class="row"><span class="label">Status</span><span class="value">${paymentStatus}</span></div>
                    <div class="row"><span class="label">Method</span><span class="value">${order.paymentMethod?.toUpperCase() ?? 'Not provided'}</span></div>
                    <div class="row"><span class="label">Reference</span><span class="value">${order.paymentReference ?? '—'}</span></div>
                  </div>
                </div>

                <div class="summary">
                  <div>
                    <div class="label" style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em;">Grand Total</div>
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Thank you for choosing FarmDirect</div>
                  </div>
                  <div class="total">${formatCurrency(order.totalPrice)}</div>
                </div>
              </div>
              <div class="footer">
                Generated on ${new Date().toLocaleString()} · ${deliveryDetails}
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }, [buyer?.name, farmer?.name, order, paymentStatus, product?.name, invoiceDateTime, deliveryDetails]);

  if (!order) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-1rem),1120px)] max-w-none overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <div className="max-h-[calc(100vh-1rem)] overflow-y-auto overflow-x-hidden rounded-[28px] border border-emerald-100 bg-slate-50 shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-green-500 px-5 py-5 text-white sm:px-8 sm:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/15 p-2 backdrop-blur">
                  <BrandLogo showText={false} imageClassName="h-11 w-11" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">FarmDirect invoice</p>
                  <h2 className="mt-2 max-w-[16ch] text-3xl font-bold tracking-tight leading-tight sm:text-4xl">Invoice for Order #{order.id}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/85">
                    Complete billing summary for your FarmDirect order with delivery, payment, and party details.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Badge className="border border-white/30 bg-white/15 text-white hover:bg-white/20">{paymentStatus}</Badge>
                <Badge className="border border-white/30 bg-white/15 text-white hover:bg-white/20">{formatDeliveryMethod(order.deliveryOption)}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Invoice metadata</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-950">{formatCurrency(order.totalPrice)}</h3>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-right md:min-w-[190px]">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Date & time</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-950">{invoiceDateTime}</p>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <Package className="h-4 w-4 text-emerald-600" />
                      Product
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{product?.name ?? order.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">{product?.category ?? 'Farm produce'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <ReceiptText className="h-4 w-4 text-emerald-600" />
                      Order ID
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{order.id}</p>
                    <p className="mt-1 text-xs text-slate-500">Created via FarmDirect</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      Payment
                    </div>
                    <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getPaymentTone(paymentStatus)}`}>{paymentStatus}</p>
                    <p className="mt-2 text-xs text-slate-500">Method: {order.paymentMethod?.toUpperCase() ?? 'Not provided'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <Truck className="h-4 w-4 text-emerald-600" />
                      Delivery
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{formatDeliveryStatus(order.deliveryStatus)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDeliveryMethod(order.deliveryOption)}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Line items</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Item</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quantity</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Unit Price</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      <tr>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                              <Store className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{product?.name ?? order.productName}</p>
                              <p className="text-sm text-slate-500">{product?.unit ?? 'Unit'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700">{order.quantity}</td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700">{formatCurrency(order.totalPrice / Math.max(order.quantity, 1))}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-950">{formatCurrency(order.totalPrice)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Grand total</p>
                    <p className="mt-2 text-sm text-slate-500">Inclusive of all order charges currently recorded in FarmDirect.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black tracking-tight text-emerald-700">{formatCurrency(order.totalPrice)}</p>
                    <p className="mt-1 text-sm text-slate-500">Payment status: {paymentStatus}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <UserCircle2 className="h-4 w-4" />
                  Buyer details
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <InfoRow label="Name" value={buyer?.name ?? order.buyerName} />
                  <InfoRow label="Email" value={buyer?.email ?? 'Not provided'} />
                  <InfoRow label="Phone" value={buyer?.phone ?? 'Not provided'} />
                  <InfoRow label="Location" value={buyer?.location ?? 'Not provided'} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <Store className="h-4 w-4" />
                  Farmer details
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <InfoRow label="Name" value={farmer?.name ?? order.farmerName} />
                  <InfoRow label="Email" value={farmer?.email ?? 'Not provided'} />
                  <InfoRow label="Phone" value={farmer?.phone ?? 'Not provided'} />
                  <InfoRow label="Location" value={farmer?.location ?? 'Not provided'} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <Truck className="h-4 w-4" />
                  Delivery details
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <InfoRow label="Method" value={formatDeliveryMethod(order.deliveryOption)} />
                  <InfoRow label="Status" value={formatDeliveryStatus(order.deliveryStatus)} />
                  <InfoRow label="Address / Pickup" value={order.deliveryOption === 'pickup' ? (order.pickupLocation ?? 'Not provided') : (order.deliveryAddress ?? 'Not provided')} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <CreditCard className="h-4 w-4" />
                  Payment details
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <InfoRow label="Status" value={paymentStatus} />
                  <InfoRow label="Method" value={order.paymentMethod?.toUpperCase() ?? 'Not provided'} />
                  <InfoRow label="Reference" value={order.paymentReference ?? '—'} />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Delivery summary</p>
                <p className="mt-3 text-sm leading-6 text-emerald-950">{deliveryDetails}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="text-sm text-slate-500">
              Invoice generated for a professional FarmDirect order record.
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button variant="outline" className="gap-2" onClick={() => void generatePdf()}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print Invoice
              </Button>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
    <span className="text-slate-500">{label}</span>
    <span className="max-w-[70%] text-right font-medium text-slate-900">{value}</span>
  </div>
);

export default InvoiceModal;
