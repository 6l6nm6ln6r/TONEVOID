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

      const currentAnalyser = getAnalyser();
      if (!currentAnalyser) {
        // Clear canvas if no analyser
        ctx.fillStyle = 'rgba(5, 5, 5, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      if (!dataArray || dataArray.length !== currentAnalyser.frequencyBinCount) {
        dataArray = new Uint8Array(currentAnalyser.frequencyBinCount);
      }

      currentAnalyser.getByteTimeDomainData(dataArray);

      const bufferLength = dataArray.length;

      // Clear canvas
      ctx.fillStyle = 'rgba(5, 5, 5, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f97316'; // orange-500
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [getAnalyser]);

  return (
    <div className="w-full h-full min-h-[120px] bg-black/40 rounded-xl border border-zinc-800/40 overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={400}
        height={150}
      />
      <div className="absolute top-2 left-2 pointer-events-none">
        <span className="text-[8px] uppercase tracking-[0.2em] text-zinc-600 font-black">Waveform</span>
      </div>
    </div>
  );
};
