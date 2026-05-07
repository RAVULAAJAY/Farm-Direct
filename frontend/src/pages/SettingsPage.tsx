import React, { useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import {
  Bell,
  Lock,
  Eye,
  Smartphone,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User } from '@/context/AuthContext';
import { useGlobalState } from '@/context/GlobalStateContext';

interface SettingsPageProps {
  user: User;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('general');
  const { updateUser, orders } = useGlobalState();
  const [isExporting, setIsExporting] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    location: user.location,
    farmName: user.farmName ?? `${user.name}'s Farm`,
    farmDetails: user.farmDetails ?? '',
  });
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setProfileForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      farmName: user.farmName ?? `${user.name}'s Farm`,
      farmDetails: user.farmDetails ?? '',
    });
  }, [user.name, user.email, user.phone, user.location, user.farmName, user.farmDetails]);

  const userOrders = useMemo(() => {
    if (user.role === 'farmer') {
      return orders.filter((order) => order.farmerId === user.id);
    }

    if (user.role === 'buyer') {
      return orders.filter((order) => order.buyerId === user.id);
    }

    return orders;
  }, [orders, user.id, user.role]);

  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  const loadImageDataUrl = (source: string) => {
    return new Promise<string | null>((resolve) => {
      if (!source) {
        resolve(null);
        return;
      }

      if (source.startsWith('data:image/')) {
        resolve(source);
        return;
      }

      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d');
          if (!context) {
            resolve(null);
            return;
          }

          context.drawImage(image, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = source;
    });
  };

  const loadImageDimensions = (source: string) => {
    return new Promise<{ width: number; height: number } | null>((resolve) => {
      if (!source) {
        resolve(null);
        return;
      }

      const image = new window.Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        resolve({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        });
      };
      image.onerror = () => resolve(null);
      image.src = source;
    });
  };

  const addContainedImage = async (
    pdfDoc: jsPDF,
    source: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
  ) => {
    const resolvedSource = await loadImageDataUrl(source);
    if (!resolvedSource || !resolvedSource.startsWith('data:image/')) {
      return false;
    }

    const dimensions = await loadImageDimensions(resolvedSource);
    if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
      return false;
    }

    const imageRatio = dimensions.width / dimensions.height;
    const boxRatio = maxWidth / maxHeight;
    let renderWidth = maxWidth;
    let renderHeight = maxHeight;

    if (imageRatio > boxRatio) {
      renderHeight = maxWidth / imageRatio;
    } else {
      renderWidth = maxHeight * imageRatio;
    }

    const offsetX = x + (maxWidth - renderWidth) / 2;
    const offsetY = y + (maxHeight - renderHeight) / 2;
    const format = resolvedSource.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    pdfDoc.addImage(resolvedSource, format, offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
    return true;
  };

  const drawWrappedRow = (
    pdfDoc: jsPDF,
    label: string,
    value: string,
    labelX: number,
    valueX: number,
    y: number,
    maxValueWidth: number,
    rowGap: number,
  ) => {
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.setTextColor(71, 85, 105);
    pdfDoc.text(label, labelX, y);

    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.setTextColor(15, 23, 42);
    const wrappedValue = pdfDoc.splitTextToSize(value, maxValueWidth);
    pdfDoc.text(wrappedValue, valueX, y);

    const lineCount = Array.isArray(wrappedValue) ? wrappedValue.length : 1;
    return y + Math.max(1, lineCount) * rowGap;
  };

  const handleDownloadMyData = async () => {
    setIsExporting(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const brandedGreen = '#15803d';
      const brandDark = '#0f172a';
      let cursorY = 18;
      const brandLogo = await loadImageDataUrl('/favicon-v2.png');

      pdf.setFillColor(16, 99, 47);
      pdf.rect(0, 0, pageWidth, 38, 'F');
      pdf.setFillColor(21, 128, 61);
      pdf.rect(0, 0, pageWidth, 9, 'F');
      if (brandLogo) {
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin, 8, 20, 20, 5, 5, 'F');
        pdf.addImage(brandLogo, 'PNG', margin + 1.8, 9.8, 16.4, 16.4, undefined, 'FAST');
      }
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('FarmDirect', margin + 26, 16);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Personal data export and account history', margin + 26, 25);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Account export', pageWidth - margin, 16, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Secure snapshot of your profile and order history', pageWidth - margin, 25, { align: 'right' });

      pdf.setTextColor(15, 23, 42);
      cursorY = 50;

      const drawSectionTitle = (title: string, y: number) => {
        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(220, 252, 231);
        pdf.roundedRect(margin, y - 4, contentWidth, 10, 3, 3, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(21, 128, 61);
        pdf.text(title, margin + 4, y + 2);
      };

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      drawSectionTitle('Profile Summary', cursorY);
      cursorY += 11;

      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(250, 252, 255);
      const profileCardTop = cursorY;
      const profileCardHeight = user.role === 'farmer' && user.farmDetails ? 58 : 50;
      pdf.roundedRect(margin, profileCardTop, contentWidth, profileCardHeight, 4, 4, 'FD');

      const profileImage = await loadImageDataUrl(user.profilePhoto ?? '');
      if (profileImage) {
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin + 4, profileCardTop + 4, 30, 30, 3, 3, 'F');
        pdf.addImage(profileImage, 'PNG', margin + 5, profileCardTop + 5, 28, 28, undefined, 'FAST');
      } else {
        pdf.setDrawColor(203, 213, 225);
        pdf.setFillColor(241, 245, 249);
        pdf.circle(margin + 18, profileCardTop + 18, 14, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(71, 85, 105);
        const initials = user.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join('');
        pdf.text(initials || 'FD', margin + 18, profileCardTop + 20, { align: 'center' });
      }

      const profileX = margin + 36;
      const profileDetails = [
        { label: 'Name', value: user.name },
        { label: 'Email', value: user.email },
        { label: 'Phone', value: user.phone || 'Not provided' },
        { label: 'Location', value: user.location || 'Not provided' },
      ];

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(user.role === 'farmer' ? (user.farmName ?? `${user.name}'s Farm`) : 'Account Details', profileX, cursorY + 10);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      let detailsY = profileCardTop + 16;
      const labelX = profileX;
      const valueX = profileX + 22;
      const maxValueWidth = margin + contentWidth - valueX - 4;

      profileDetails.forEach((item) => {
        detailsY = drawWrappedRow(pdf, `${item.label}:`, item.value, labelX, valueX, detailsY, maxValueWidth, 5);
      });

      cursorY = profileCardTop + profileCardHeight + 10;

      if (user.role === 'farmer' && user.farmerOnboarding?.idProofDataUrl) {
        const proofDataUrl = user.farmerOnboarding.idProofDataUrl;
        const proofCardTop = cursorY;
        const proofIsImage = proofDataUrl.startsWith('data:image/');
        const proofCardHeight = proofIsImage ? 76 : 26;

        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin, proofCardTop, contentWidth, proofCardHeight, 3, 3, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text('ID Proof', margin + 4, proofCardTop + 8);

        if (proofIsImage) {
          const proofDrawn = await addContainedImage(pdf, proofDataUrl, margin + 4, proofCardTop + 12, contentWidth - 8, 56);
          if (!proofDrawn) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(71, 85, 105);
            pdf.text(user.farmerOnboarding.idProofFileName || 'Uploaded proof file', margin + 4, proofCardTop + 18);
          }
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(71, 85, 105);
          pdf.text(user.farmerOnboarding.idProofFileName || 'Uploaded proof file', margin + 4, proofCardTop + 18);
        }

        cursorY = proofCardTop + proofCardHeight + 10;
      }

      if (user.role === 'buyer' && user.buyerOnboarding?.idProofDataUrl) {
        const proofDataUrl = user.buyerOnboarding.idProofDataUrl;
        const proofCardTop = cursorY;
        const proofIsImage = proofDataUrl.startsWith('data:image/');
        const proofCardHeight = proofIsImage ? 76 : 26;

        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin, proofCardTop, contentWidth, proofCardHeight, 3, 3, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text('ID Proof', margin + 4, proofCardTop + 8);

        if (proofIsImage) {
          const proofDrawn = await addContainedImage(pdf, proofDataUrl, margin + 4, proofCardTop + 12, contentWidth - 8, 56);
          if (!proofDrawn) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(71, 85, 105);
            pdf.text(user.buyerOnboarding.idProofFileName || 'Uploaded proof file', margin + 4, proofCardTop + 18);
          }
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(71, 85, 105);
          pdf.text(user.buyerOnboarding.idProofFileName || 'Uploaded proof file', margin + 4, proofCardTop + 18);
        }

        cursorY = proofCardTop + proofCardHeight + 10;
      }

      if (user.role === 'farmer' && user.farmDetails) {
        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(250, 252, 255);
        const bioCardHeight = Math.max(24, pdf.splitTextToSize(user.farmDetails, contentWidth - 8).length * 5 + 16);
        pdf.roundedRect(margin, cursorY, contentWidth, bioCardHeight, 4, 4, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text('Farm Bio', margin + 4, cursorY + 8);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        const bioLines = pdf.splitTextToSize(user.farmDetails, contentWidth - 8);
        pdf.text(bioLines, margin + 4, cursorY + 15);

        cursorY += bioCardHeight + 8;
      }

      pdf.setTextColor(15, 23, 42);
      drawSectionTitle('Order History', cursorY);
      cursorY += 11;

      if (userOrders.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text('No orders found for this account.', margin, cursorY + 8);
      } else {
        autoTable(pdf, {
          startY: cursorY + 4,
          head: [[
            'Date',
            'Order ID',
            'Product',
            'Qty',
            'Amount',
            'Status',
            user.role === 'farmer' ? 'Buyer' : 'Farmer',
          ]],
          body: userOrders
            .slice()
            .sort((left, right) => new Date(right.orderDate).getTime() - new Date(left.orderDate).getTime())
            .map((order) => [
              order.orderDate,
              order.id,
              order.productName,
              String(order.quantity),
              formatCurrency(order.totalPrice),
              order.status,
              user.role === 'farmer' ? order.buyerName : order.farmerName,
            ]),
          theme: 'grid',
          styles: {
            font: 'helvetica',
            fontSize: 8,
            textColor: brandDark,
            lineColor: '#dbe4ee',
            lineWidth: 0.2,
            cellPadding: 2.2,
          },
          headStyles: {
            fillColor: brandedGreen,
            textColor: '#ffffff',
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: '#f8fafc',
          },
          margin: { left: margin, right: margin },
        });
      }

      const finalY = (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? cursorY + 14;
      const footerY = Math.min(finalY + 10, pageHeight - 18);
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, footerY);
      pdf.text('FarmDirect account export', pageWidth - margin, footerY, { align: 'right' });

      const filename = `FarmDirect_${user.role}_${user.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_data_export.pdf`;
      pdf.save(filename);
      setStatusMessage('Your FarmDirect PDF export has been downloaded.');
      window.setTimeout(() => setStatusMessage(''), 2500);
    } catch {
      setStatusMessage('Unable to create the PDF export right now.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProfile = () => {
    updateUser(user.id, {
      name: profileForm.name.trim() || user.name,
      email: profileForm.email.trim() || user.email,
      phone: profileForm.phone.trim() || user.phone,
      location: profileForm.location.trim() || user.location,
      farmName: user.role === 'farmer' ? (profileForm.farmName.trim() || `${user.name}'s Farm`) : undefined,
      farmDetails: user.role === 'farmer' ? profileForm.farmDetails.trim() : undefined,
    });

    setStatusMessage('Profile saved successfully.');
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {[
            { id: 'general', label: 'General', icon: '⚙️' },
            { id: 'security', label: 'Security', icon: '🔒' },
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
            { id: 'privacy', label: 'Privacy', icon: '👁️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          {statusMessage && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 text-sm text-green-800">
                {statusMessage}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your basic account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  type="email"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={profileForm.location}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, location: event.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-2"
                />
              </div>
              {user.role === 'farmer' && (
                <>
                  <div>
                    <Label>Farm Name</Label>
                    <Input
                      value={profileForm.farmName}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, farmName: event.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Farm Bio</Label>
                    <Textarea
                      value={profileForm.farmDetails}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, farmDetails: event.target.value }))}
                      className="mt-2"
                      placeholder="Add details about your farm and produce."
                    />
                  </div>
                </>
              )}
              <Button onClick={handleSaveProfile} className="w-full bg-green-600 hover:bg-green-700">Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language & Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Language</Label>
                <select className="w-full mt-2 px-3 py-2 border rounded-lg">
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Tamil</option>
                </select>
              </div>
              <div>
                <Label>Timezone</Label>
                <select className="w-full mt-2 px-3 py-2 border rounded-lg">
                  <option>Asia/Kolkata (IST)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password regularly for security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input type="password" placeholder="Enter current password" className="mt-2" />
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" placeholder="Enter new password" className="mt-2" />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="Confirm new password" className="mt-2" />
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700">Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">SMS Authentication</p>
                    <p className="text-sm text-gray-600">Not enabled</p>
                  </div>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">This Browser</p>
                  <p className="text-sm text-gray-600">Last active: now</p>
                </div>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Current</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Order Updates', desc: 'Get notified about new orders' },
                { label: 'Messages', desc: 'Receive notifications when you get new messages' },
                { label: 'Marketing', desc: 'Receive promotional emails and updates' },
                { label: 'Account Activity', desc: 'Security alerts and account changes' },
              ].map((item) => (
                <label key={item.label} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-1 rounded" />
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="text-gray-900">Push notifications enabled</span>
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Privacy Settings */}
      {activeTab === 'privacy' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="profile" defaultChecked className="rounded-full" />
                <span className="text-gray-900">Public - Anyone can view your profile</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="radio" name="profile" className="rounded-full" />
                <span className="text-gray-900">Private - Only connections can view</span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleDownloadMyData}
                disabled={isExporting}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isExporting ? 'Preparing PDF...' : 'Download My Data'}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Trash2 className="h-4 w-4 mr-2" />
                Request Data Deletion
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                Delete Account Permanently
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
