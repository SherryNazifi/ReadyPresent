const pupils = document.querySelectorAll('.pupil');
        const eyes = document.querySelectorAll('.eye');

        // --- Mouse Tracking Logic ---
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            pupils.forEach(pupil => {
                const eye = pupil.parentElement;
                const rect = eye.getBoundingClientRect();
                const eyeCenterX = rect.left + rect.width / 2;
                const eyeCenterY = rect.top + rect.height / 2;

                const angle = Math.atan2(mouseY - eyeCenterY, mouseX - eyeCenterX);
                const distance = Math.min(rect.width / 4, Math.hypot(mouseX - eyeCenterX, mouseY - eyeCenterY) / 10);
                
                const moveX = Math.cos(angle) * distance;
                const moveY = Math.sin(angle) * distance;

                pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });

        // --- Randomized Blinking Logic ---
        function triggerBlink() {
            eyes.forEach(eye => eye.classList.add('blinking'));
            
            // Remove the class after animation finishes so it can be re-triggered
            setTimeout(() => {
                eyes.forEach(eye => eye.classList.remove('blinking'));
            }, 150);

            // Schedule the next blink between 3000ms (3s) and 5000ms (5s)
            const nextBlink = Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
            setTimeout(triggerBlink, nextBlink);
        }

        // Initiate the first blink cycle
        setTimeout(triggerBlink, 3000);