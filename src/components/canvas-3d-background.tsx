"use client";

import React, { useEffect, useRef } from "react";

interface LaserPulse {
  axis: "h" | "v";
  pos: number;      // Y position if horizontal, X position if vertical
  progress: number; // 0 to 1
  speed: number;
  length: number;
  color: string;
}

export default function Canvas3DBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = Math.max(window.innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight || 0));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = Math.max(window.innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight || 0);
    };
    window.addEventListener("resize", handleResize);

    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.pageX;
      mouse.targetY = e.pageY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Dynamic Crisp White & Indigo Light Beams spanning entire document height
    const pulses: LaserPulse[] = [];
    const pulseCount = 45;

    const createPulse = (): LaserPulse => {
      const isHorizontal = Math.random() > 0.5;
      return {
        axis: isHorizontal ? "h" : "v",
        pos: isHorizontal 
          ? Math.floor((Math.random() * height) / 60) * 60 
          : Math.floor((Math.random() * width) / 60) * 60,
        progress: Math.random() * 0.2,
        speed: 0.003 + Math.random() * 0.007,
        length: 180 + Math.random() * 260,
        color: Math.random() > 0.2 ? "#FFFFFF" : "#818CF8"
      };
    };

    for (let i = 0; i < pulseCount; i++) {
      pulses.push(createPulse());
    }

    const render = () => {
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      const gridSize = 60;

      // 1. Crisp White Background Grid - High Visibility Spanning Full Height
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Pure White Glowing Intersection Crosses Spanning Full Height
      ctx.fillStyle = "#FFFFFF";
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
      }

      // 3. Render Shooting Crisp White Laser Beams Across Entire Scroll Height
      pulses.forEach((p, idx) => {
        p.progress += p.speed;
        if (p.progress >= 1.2) {
          pulses[idx] = createPulse();
        }

        const headPos = p.progress * (p.axis === "h" ? width : height);
        const tailPos = Math.max(0, headPos - p.length);

        ctx.beginPath();
        if (p.axis === "h") {
          const grad = ctx.createLinearGradient(tailPos, p.pos, headPos, p.pos);
          grad.addColorStop(0, "rgba(255, 255, 255, 0)");
          grad.addColorStop(0.7, p.color);
          grad.addColorStop(1, "#FFFFFF");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.moveTo(tailPos, p.pos);
          ctx.lineTo(headPos, p.pos);
        } else {
          const grad = ctx.createLinearGradient(p.pos, tailPos, p.pos, headPos);
          grad.addColorStop(0, "rgba(255, 255, 255, 0)");
          grad.addColorStop(0.7, p.color);
          grad.addColorStop(1, "#FFFFFF");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.moveTo(p.pos, tailPos);
          ctx.lineTo(p.pos, headPos);
        }
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#FFFFFF";
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // 4. Interactive Mouse Crosshair & White Spotlight Beam
      if (mouse.active) {
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 450);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.18)");
        glow.addColorStop(0.4, "rgba(129, 140, 248, 0.12)");
        glow.addColorStop(1, "rgba(9, 12, 21, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        const snapX = Math.round(mouse.x / gridSize) * gridSize;
        const snapY = Math.round(mouse.y / gridSize) * gridSize;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(0, snapY);
        ctx.lineTo(width, snapY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(snapX, 0);
        ctx.lineTo(snapX, height);
        ctx.stroke();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#FFFFFF";
        ctx.strokeRect(snapX - 10, snapY - 10, 20, 20);
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0
      }}
    />
  );
}
