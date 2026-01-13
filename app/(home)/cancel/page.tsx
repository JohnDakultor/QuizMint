


"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CancelPage() {
  const router = useRouter();

  // Optional: You can add auto-redirect after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      // Auto-redirect to home after 10 seconds
      // router.push("/home");
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [router]);

  const handleReturnHome = () => {
    router.push("/home");
  };

  const handleTryAgain = () => {
    router.push("/subscription");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen  from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Payment Cancelled
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 pt-2">
            No charges have been made to your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert variant="default" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-300 font-medium">
              What happened?
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
              You cancelled the payment process. Your subscription was not activated and no money was charged.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">You can:</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <span className="mr-2 text-red-500">•</span>
                <span>Try again with a different payment method</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-red-500">•</span>
                <span>Contact support if you encountered issues</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-red-500">•</span>
                <span>Return to browse other plans</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Need help? Contact our support team at{" "}
              <a href="mailto:support@quizforge.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                support@quizmintai.com
              </a>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button
            onClick={handleReturnHome}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>

          <div className="flex space-x-2 w-full">
            <Button
              onClick={handleTryAgain}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Button
              onClick={handleGoBack}
              variant="ghost"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}