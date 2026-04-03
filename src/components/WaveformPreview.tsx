import { useEffect, useRef } from 'react';

interface WaveformPreviewProps {
  getAnalyser: () => AnalyserNode | null;
}

export const WaveformPreview = ({ getAnalyser }: WaveformPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let dataArray: Uint8Array | null = null;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      // Sync canvas resolution with display size
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      // Clear canvas
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      
      const gridSize = 40;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Center Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      const currentAnalyser = getAnalyser();
      if (!currentAnalyser) return;

      if (!dataArray || dataArray.length !== currentAnalyser.frequencyBinCount) {
        dataArray = new Uint8Array(currentAnalyser.frequencyBinCount);
      }

      currentAnalyser.getByteTimeDomainData(dataArray);

      const bufferLength = dataArray.length;

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f97316'; // orange-500
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(249, 115, 22, 0.5)';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      let hasSignal = false;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        
        if (Math.abs(dataArray[i] - 128) > 1) hasSignal = true;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      
      if (hasSignal) {
        ctx.stroke();
      } else {
        // Resting state: subtle pulse on the center line
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.2)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
      
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [getAnalyser]);

  return (
    <div className="w-full h-full bg-black/20 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};
