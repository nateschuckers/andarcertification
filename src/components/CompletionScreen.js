import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const ConfettiAnimation = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.parentElement.offsetWidth;
        let height = canvas.parentElement.offsetHeight;
        canvas.width = width;
        canvas.height = height;
        let confetti = [];

        const ConfettiPiece = function() {
            this.x = Math.random() * width;
            this.y = Math.random() * height - height;
            this.size = Math.random() * 8 + 5;
            this.speed = Math.random() * 5 + 2;
            this.gravity = 0.5;
            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 2 - 1;
            this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        };

        ConfettiPiece.prototype.update = function() {
            this.y += this.speed;
            this.speed += this.gravity;
            this.x += Math.sin(this.y / 20) * 2;
            this.rotation += this.rotationSpeed;
            if (this.y > height) {
                this.y = -20;
                this.x = Math.random() * width;
                this.speed = Math.random() * 5 + 2;
            }
        };

        ConfettiPiece.prototype.draw = function() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        };

        const createConfetti = () => {
            for (let i = 0; i < 200; i++) {
                confetti.push(new ConfettiPiece());
            }
        };

        let animationFrameId;
        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            confetti.forEach(piece => {
                piece.update();
                piece.draw();
            });
            animationFrameId = requestAnimationFrame(animate);
        };
        
        const handleResize = () => {
            width = canvas.parentElement.offsetWidth;
            height = canvas.parentElement.offsetHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);
        createConfetti();
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />;
};


const CompletionScreen = ({ score, totalQuestions, onBack, onRetry }) => {
    const passRate = 80;
    const userScorePercent = Math.round((score / totalQuestions) * 100);
    const hasPassed = userScorePercent >= passRate;

    const passMessages = ["Congratulations!", "Excellent Work!", "You're a Certified Pro!", "Outstanding Performance!"];
    const failMessages = ["So Close!", "Don't Give Up!", "Almost There!", "Give It Another Go!"];

    const title = hasPassed 
        ? passMessages[Math.floor(Math.random() * passMessages.length)]
        : failMessages[Math.floor(Math.random() * failMessages.length)];
    
    const subtitle = hasPassed
        ? "You have successfully passed the course."
        : "You didn't pass this time, but practice makes perfect. Feel free to try again!";
    
    const icon = hasPassed ? 'fa-check' : 'fa-times';
    const iconColor = hasPassed ? 'bg-green-500' : 'bg-red-500';
    const textColor = hasPassed ? 'text-green-500' : 'text-red-500';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="relative bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-2xl max-w-lg w-full m-4 text-center overflow-hidden">
                {hasPassed && <ConfettiAnimation />}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full ${iconColor} flex items-center justify-center text-white text-4xl border-4 border-neutral-100 dark:border-neutral-800`}>
                    <i className={`fa ${icon}`}></i>
                </div>
                <div className="p-8 pt-16">
                    <h2 className={`text-3xl font-bold ${textColor} mb-3`}>{title}</h2>
                    <p className="text-neutral-600 dark:text-neutral-300 mb-6">{subtitle}</p>
                    <div className="bg-neutral-200 dark:bg-neutral-700/50 p-4 rounded-lg">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">YOUR SCORE</p>
                        <p className="text-5xl font-bold text-neutral-900 dark:text-white my-2">{userScorePercent}%</p>
                        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">({score} / {totalQuestions} correct)</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-neutral-900/50 p-4 flex justify-center space-x-4">
                    {hasPassed ? (
                        <button onClick={onBack} className="btn-primary text-white font-bold py-3 px-6 rounded-lg w-full">Back to Courses</button>
                    ) : (
                        <>
                            <button onClick={onBack} className="btn-secondary text-white font-bold py-3 px-6 rounded-lg w-1/2">Back to Courses</button>
                            <button onClick={onRetry} className="btn-primary text-white font-bold py-3 px-6 rounded-lg w-1/2">Retry Course</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

CompletionScreen.propTypes = {
    score: PropTypes.number.isRequired,
    totalQuestions: PropTypes.number.isRequired,
    onBack: PropTypes.func.isRequired,
    onRetry: PropTypes.func.isRequired,
};

export default CompletionScreen;
