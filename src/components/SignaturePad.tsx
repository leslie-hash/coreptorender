import React, { useRef, useEffect, useState } from 'react';
import { PenLine, Eraser, Save, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel?: () => void;
  signerName?: string;
  signerRole?: 'team-member' | 'csp';
  existingSignature?: string;
  readOnly?: boolean;
}

export default function SignaturePad({
  onSave,
  onCancel,
  signerName = '',
  signerRole = 'team-member',
  existingSignature,
  readOnly = false
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!existingSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw existing signature if available
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const signature = canvas.toDataURL('image/png');
    onSave(signature);
  };

  const roleLabel = signerRole === 'csp' ? 'CSP' : 'Team Member';
  const roleColor = signerRole === 'csp' ? 'border-purple-500' : 'border-blue-500';
  const roleBg = signerRole === 'csp' ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-blue-50 dark:bg-blue-900/20';

  return (
    <div className={`rounded-lg border-2 ${roleColor} p-4 ${roleBg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PenLine className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {roleLabel} Signature
          </span>
        </div>
        {signerName && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {signerName}
          </span>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className={`w-full bg-white border border-gray-300 rounded-lg ${readOnly ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {!hasSignature && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm">Sign here</span>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={clearSignature}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Eraser className="w-4 h-4" />
            Clear
          </button>
          
          <div className="flex gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
            <button
              onClick={saveSignature}
              disabled={!hasSignature}
              className="flex items-center gap-1 px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Signature
            </button>
          </div>
        </div>
      )}

      {readOnly && existingSignature && (
        <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          ✓ Signed
        </div>
      )}
    </div>
  );
}

// Compact signature display component for showing existing signatures
export function SignatureDisplay({ 
  signature, 
  signerName, 
  signedAt,
  role 
}: { 
  signature?: string; 
  signerName?: string; 
  signedAt?: string;
  role: 'team-member' | 'csp';
}) {
  if (!signature) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <PenLine className="w-4 h-4" />
        <span>Awaiting {role === 'csp' ? 'CSP' : 'Team Member'} signature</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <img 
        src={signature} 
        alt={`${role === 'csp' ? 'CSP' : 'Team Member'} signature`}
        className="h-12 border border-gray-200 rounded bg-white"
      />
      <div className="text-sm">
        <div className="font-medium text-gray-700 dark:text-gray-300">{signerName}</div>
        {signedAt && (
          <div className="text-gray-500 text-xs">
            Signed {new Date(signedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
