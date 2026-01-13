"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PayPalSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [planType, setPlanType] = useState<string>('');

  useEffect(() => {
    const verifySubscription = async () => {
      const subscriptionId = searchParams.get('subscription_id');
      const urlPlanType = searchParams.get('planType'); // Get planType from URL
      
      console.log('🔍 Success page params:', {
        subscriptionId,
        urlPlanType,
        allParams: Object.fromEntries(searchParams.entries())
      });

      if (!subscriptionId) {
        setStatus('error');
        setMessage('No subscription ID found');
        return;
      }

      try {
        // Always pass the planType to verification
        const payload = { 
          subscriptionId,
          planType: urlPlanType // THIS IS CRITICAL!
        };
        
        console.log('📤 Sending to verification API:', payload);

        const response = await fetch('/api/paypal/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('📊 Verification API response:', data);

        if (response.ok) {
          setStatus('success');
          // Use the planType from the response, not just URL
          const confirmedPlanType = data.user?.subscriptionPlan || urlPlanType || 'premium';
          setPlanType(confirmedPlanType);
          setMessage(`Successfully subscribed to ${confirmedPlanType} plan!`);
          
          // Redirect to account page after 3 seconds
          setTimeout(() => {
            router.push('/account');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        setStatus('error');
        setMessage('Network error occurred');
      }
    };

    verifySubscription();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verifying Your Subscription</h1>
            <p className="text-gray-600 mb-6">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Payment Successful! 🎉</h1>
            <p className="text-gray-600 mb-2">{message}</p>
            <p className="text-lg font-semibold text-blue-600 mb-6">
              ${planType === 'premium' ? '15.00' : '5.00'}/month
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting to your account page...
            </p>
            <Button onClick={() => router.push('/account')}>
              Go to Account
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/subscription')}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push('/account')}>
                Go to Account
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}