document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const form = document.getElementById('predictForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loader');
    
    // Result Elements
    const resultWrapper = document.getElementById('resultWrapper');
    const resultCard = document.getElementById('resultCard');
    const probValue = document.getElementById('probValue');
    const gaugeValue = document.getElementById('gaugeValue');
    const predictionText = document.getElementById('predictionText');
    const insightsContainer = document.getElementById('insightsContainer');
    const riskFactorsList = document.getElementById('riskFactorsList');
    const recommendationText = document.getElementById('recommendationText');
    
    // Special Form Fields
    const internetServiceSelect = document.getElementById('internetService');
    const internetDependentDiv = document.querySelector('.internet-dependent');
    const phoneServiceSelect = document.querySelector('select[name="PhoneService"]');
    const multipleLinesSelect = document.querySelector('select[name="MultipleLines"]');

    // Toast Notification logic
    function showToast(message, type = 'error') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        // Remove toast after animation (3s + 0.3s)
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 3500);
    }

    // Wizard Logic
    let currentStep = 1;
    const totalSteps = 3;
    const steps = document.querySelectorAll('.wizard-step');
    const progressIndicators = document.querySelectorAll('.progress-step');

    function updateWizard() {
        // Update DOM visibility
        steps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.remove('hidden');
                step.classList.add('active');
            } else {
                step.classList.add('hidden');
                step.classList.remove('active');
            }
        });
        
        // Update progress indicators
        progressIndicators.forEach((indicator, index) => {
            if (index + 1 <= currentStep) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Validate step before proceeding
            let valid = true;
            if (currentStep === 2) {
                const tenure = parseFloat(form.elements['tenure'].value);
                const monthlyCharges = parseFloat(form.elements['MonthlyCharges'].value);
                if (tenure < 0 || tenure > 150) {
                    showToast("Please enter a valid Tenure (0 - 150 months).");
                    valid = false;
                }
                if (monthlyCharges < 0 || monthlyCharges > 500) {
                    showToast("Please enter valid Monthly Charges ($0 - $500).");
                    valid = false;
                }
            }
            
            if (valid && currentStep < totalSteps) {
                currentStep++;
                updateWizard();
            }
        });
    });

    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateWizard();
            }
        });
    });

    // Start Over
    document.getElementById('startOverBtn').addEventListener('click', () => {
        form.reset();
        currentStep = 1;
        updateWizard();
        resultCard.classList.add('hidden');
        form.style.display = 'block';
        document.querySelector('.wizard-progress').style.display = 'flex';
        // Trigger manual change for UI updates
        if (internetServiceSelect) internetServiceSelect.dispatchEvent(new Event('change'));
        if (phoneServiceSelect) phoneServiceSelect.dispatchEvent(new Event('change'));
    });

    // Handle Phone Service dependency visually
    if (phoneServiceSelect && multipleLinesSelect) {
        phoneServiceSelect.addEventListener('change', (e) => {
            if (e.target.value === 'No') {
                multipleLinesSelect.value = 'No';
                multipleLinesSelect.style.opacity = '0.4';
                multipleLinesSelect.style.pointerEvents = 'none';
            } else {
                multipleLinesSelect.style.opacity = '1';
                multipleLinesSelect.style.pointerEvents = 'auto';
            }
        });
    }

    // Handle Internet Service dependency visually
    internetServiceSelect.addEventListener('change', (e) => {
        if (e.target.value === 'No') {
            internetDependentDiv.style.opacity = '0.4';
            internetDependentDiv.style.pointerEvents = 'none';
            // Set all inner selects to 'No'
            const selects = internetDependentDiv.querySelectorAll('select');
            selects.forEach(select => select.value = 'No');
        } else {
            internetDependentDiv.style.opacity = '1';
            internetDependentDiv.style.pointerEvents = 'auto';
        }
    });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Final UI loading
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                displayResult(result, data);
                showToast("Prediction Complete!", "success");
            } else {
                showToast('Error predicting churn: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to connect to the prediction server.');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    });

    function displayResult(result, inputData) {
        // Hide Form, Show Result
        form.style.display = 'none';
        document.querySelector('.wizard-progress').style.display = 'none';
        resultCard.classList.remove('hidden');

        const prob = result.probability; 
        const percentage = Math.round(prob * 100);

        // Animate numbers
        animateValue(probValue, 0, percentage, 1000);

        // Animate gauge (125 offset total)
        const offset = 125 - (125 * prob);
        let color = 'var(--success)';
        if (prob >= 0.5) color = 'var(--danger)';
        else if (prob >= 0.3) color = '#f59e0b';

        setTimeout(() => {
            gaugeValue.style.strokeDashoffset = offset;
            gaugeValue.style.stroke = color;
        }, 100);

        predictionText.textContent = result.prediction_text;
        predictionText.classList.remove('churn', 'stay');
        if (result.prediction === 1) predictionText.classList.add('churn');
        else predictionText.classList.add('stay');

        // Insights
        if (result.risk_factors && result.recommendation) {
            insightsContainer.classList.remove('hidden');
            riskFactorsList.innerHTML = '';
            if (result.risk_factors.length > 0) {
                result.risk_factors.forEach(factor => {
                    const li = document.createElement('li');
                    li.textContent = factor;
                    riskFactorsList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = "No major risk factors detected.";
                riskFactorsList.appendChild(li);
            }
            recommendationText.textContent = result.recommendation;
        }
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

});
