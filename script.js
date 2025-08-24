// ===== CONFIGURATION =====
const CONFIG = {
    MAKE_WEBHOOK_URL: 'https://hook.eu2.make.com/969nskx4hbgd2nn4wh1p4a15rh0630v1',
    MAX_RETRIES: 3,
    TIMEOUT_MS: 30000,
    BUSINESS_HOURS: {
        start: 9,  // 9 AM
        end: 17    // 5 PM
    },
    BLOCKED_DAYS: [0, 6], // Sunday and Saturday
    MAX_DAYS_AHEAD: 90
};

// ===== GLOBAL VARIABLES =====
let selectedCallType = null;
let phoneConfirmed = null;
let detectedPhoneNumber = null;
let currentRetryAttempt = 0;
let lastBookingData = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeDateInput();
    setupEventListeners();
    console.log('Enhanced booking calendar loaded with error handling');
});

function initializeDateInput() {
    const dateInput = document.getElementById('dateInput');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + CONFIG.MAX_DAYS_AHEAD);
    
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
}

function setupEventListeners() {
    // Real-time validation
    document.getElementById('name').addEventListener('blur', validateName);
    document.getElementById('dateInput').addEventListener('change', validateDate);
    document.getElementById('time').addEventListener('change', validateTime);
    document.getElementById('customPhone').addEventListener('blur', validatePhone);
}

// ===== VALIDATION FUNCTIONS =====
function sanitizeInput(input) {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/[<>]/g, '')
                   .trim();
}

function validateName() {
    const name = document.getElementById('name').value.trim();
    const nameError = document.getElementById('nameError');
    const nameInput = document.getElementById('name');
    
    if (!name) {
        showFieldError(nameInput, nameError, 'Name is required');
        return false;
    }
    
    if (name.length < 2) {
        showFieldError(nameInput, nameError, 'Name must be at least 2 characters');
        return false;
    }
    
    if (name.length > 50) {
        showFieldError(nameInput, nameError, 'Name must be less than 50 characters');
        return false;
    }
    
    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
        showFieldError(nameInput, nameError, 'Name can only contain letters, spaces, hyphens and apostrophes');
        return false;
    }
    
    clearFieldError(nameInput, nameError);
    return true;
}

function validateDate() {
    const dateValue = document.getElementById('dateInput').value;
    const dateError = document.getElementById('dateError');
    const dateInput = document.getElementById('dateInput');
    
    if (!dateValue) {
        showFieldError(dateInput, dateError, 'Date is required');
        return false;
    }
    
    const selectedDate = new Date(dateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showFieldError(dateInput, dateError, 'Cannot select a date in the past');
        return false;
    }
    
    const dayOfWeek = selectedDate.getDay();
    if (CONFIG.BLOCKED_DAYS.includes(dayOfWeek)) {
        showFieldError(dateInput, dateError, 'Please select a weekday (Monday-Friday)');
        return false;
    }
    
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + CONFIG.MAX_DAYS_AHEAD);
    if (selectedDate > maxDate) {
        showFieldError(dateInput, dateError, `Cannot book more than ${CONFIG.MAX_DAYS_AHEAD} days ahead`);
        return false;
    }
    
    clearFieldError(dateInput, dateError);
    return true;
}

function validateTime() {
    const time = document.getElementById('time').value;
    const timeError = document.getElementById('timeError');
    const timeInput = document.getElementById('time');
    
    if (!time) {
        showFieldError(timeInput, timeError, 'Time is required');
        return false;
    }
    
    const timeHour = parseInt(time.split(':')[0]);
    if (timeHour < CONFIG.BUSINESS_HOURS.start || timeHour >= CONFIG.BUSINESS_HOURS.end) {
        showFieldError(timeInput, timeError, `Please select a time between ${CONFIG.BUSINESS_HOURS.start}:00 AM and ${CONFIG.BUSINESS_HOURS.end}:00 PM`);
        return false;
    }
    
    clearFieldError(timeInput, timeError);
    return true;
}

function validatePhone() {
    if (selectedCallType !== 'mobile' || phoneConfirmed === true) {
        return true;
    }
    
    const phone = document.getElementById('customPhone').value.trim();
    const phoneError = document.getElementById('phoneError');
    const phoneInput = document.getElementById('customPhone');
    
    if (!phone) {
        showFieldError(phoneInput, phoneError, 'Phone number is required for mobile calls');
        return false;
    }
    
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\(\)\-\.]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
        showFieldError(phoneInput, phoneError, 'Please enter a valid phone number');
        return false;
    }
    
    clearFieldError(phoneInput, phoneError);
    return true;
}

function validateCallType() {
    const callTypeError = document.getElementById('callTypeError');
    
    if (!selectedCallType) {
        showFieldError(null, callTypeError, 'Please select a call type');
        return false;
    }
    
    if (selectedCallType === 'mobile' && phoneConfirmed === null) {
        showFieldError(null, callTypeError, 'Please confirm your phone number');
        return false;
    }
    
    clearFieldError(null, callTypeError);
    return true;
}

function showFieldError(input, errorElement, message) {
    if (input) {
        input.classList.add('error');
    }
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function clearFieldError(input, errorElement) {
    if (input) {
        input.classList.remove('error');
    }
    errorElement.classList.remove('show');
}

function showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} show`;
    alertDiv.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

// ===== UTILITY FUNCTIONS =====
function generateBookingId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `TB-${timestamp}-${random}`;
}

function detectPhoneNumber() {
    const mockNumbers = [
        '+1 (555) 123-4567',
        '+44 7700 900123',
        '+1 (555) 987-6543'
    ];
    return mockNumbers[Math.floor(Math.random() * mockNumbers.length)];
}

function formatTime(time24) {
    try {
        const timeObj = new Date(`2000-01-01T${time24}`);
        return timeObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return time24;
    }
}

function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateStr;
    }
}

// ===== UI FUNCTIONS =====
function selectCallType(type) {
    try {
        // Reset previous selections
        document.querySelectorAll('.checkbox-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelectorAll('input[name="callType"]').forEach(input => {
            input.checked = false;
        });

        // Select current option
        const selectedOption = type === 'video' ? 
            document.querySelector('.checkbox-option:first-child') : 
            document.querySelector('.checkbox-option:last-child');
        
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        const checkbox = document.getElementById(type === 'video' ? 'videoCall' : 'mobileCall');
        if (checkbox) {
            checkbox.checked = true;
        }
        
        selectedCallType = type;

        // Clear call type error
        clearFieldError(null, document.getElementById('callTypeError'));

        // Show phone section if mobile is selected
        if (type === 'mobile') {
            detectedPhoneNumber = detectPhoneNumber();
            document.getElementById('detectedPhone').textContent = detectedPhoneNumber;
            document.getElementById('phoneSection').classList.remove('hidden');
            document.getElementById('customPhoneSection').classList.add('hidden');
            phoneConfirmed = null;
            
            // Reset confirmation buttons
            document.querySelectorAll('.confirmation-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
        } else {
            document.getElementById('phoneSection').classList.add('hidden');
            document.getElementById('customPhoneSection').classList.add('hidden');
            phoneConfirmed = null;
        }
    } catch (error) {
        console.error('Error selecting call type:', error);
        showAlert('Error selecting call type. Please try again.', 'error');
    }
}

function confirmPhone(isCorrect) {
    try {
        // Reset confirmation buttons
        document.querySelectorAll('.confirmation-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select clicked button
        const buttons = document.querySelectorAll('.confirmation-btn');
        if (isCorrect) {
            buttons[0].classList.add('selected');
            document.getElementById('customPhoneSection').classList.add('hidden');
            clearFieldError(null, document.getElementById('phoneError'));
        } else {
            buttons[1].classList.add('selected');
            document.getElementById('customPhoneSection').classList.remove('hidden');
        }
        
        phoneConfirmed = isCorrect;
    } catch (error) {
        console.error('Error confirming phone:', error);
        showAlert('Error processing phone confirmation. Please try again.', 'error');
    }
}

function showLoadingScreen() {
    try {
        document.getElementById('bookingForm').classList.add('hidden');
        document.getElementById('errorScreen').classList.add('hidden');
        document.getElementById('successScreen').classList.add('hidden');
        document.getElementById('loadingScreen').classList.remove('hidden');
        document.getElementById('attemptCounter').textContent = currentRetryAttempt + 1;
        document.getElementById('loadingScreen').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error showing loading screen:', error);
    }
}

function showSuccessScreen(bookingData) {
    try {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('errorScreen').classList.add('hidden');
        
        // Update booking details
        const detailsDiv = document.getElementById('bookingDetails');
        detailsDiv.innerHTML = `
            <p><strong>Booking ID:</strong> <span class="booking-id">${bookingData.bookingId}</span></p>
            <p><strong>Name:</strong> ${sanitizeInput(bookingData.name)}</p>
            <p><strong>Date:</strong> ${formatDate(bookingData.date)}</p>
            <p><strong>Time:</strong> ${formatTime(bookingData.time)}</p>
            <p><strong>Call Type:</strong> ${bookingData.callType === 'video' ? 'Video Call' : 'Mobile Call'}</p>
            ${bookingData.phoneNumber ? `<p><strong>Phone:</strong> ${sanitizeInput(bookingData.phoneNumber)}</p>` : ''}
        `;

        document.getElementById('successScreen').classList.remove('hidden');
        document.getElementById('successScreen').scrollIntoView({ behavior: 'smooth' });
        
        // Reset form state
        currentRetryAttempt = 0;
        lastBookingData = null;
    } catch (error) {
        console.error('Error showing success screen:', error);
        showAlert('Booking successful, but there was an error displaying the confirmation.', 'warning');
    }
}

function showErrorScreen(errorInfo = {}) {
    try {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('successScreen').classList.add('hidden');
        
        const errorMessage = document.getElementById('errorMessage');
        const errorDetails = document.getElementById('errorDetails');
        
        // Set error message based on type
        let message = 'Please try again or contact support.';
        let details = '';
        
        if (errorInfo.type === 'network') {
            message = 'Network connection issue. Please check your internet connection.';
            details = `Status: ${errorInfo.status || 'No response'}\nAttempts made: ${currentRetryAttempt + 1}/${CONFIG.MAX_RETRIES}`;
        } else if (errorInfo.type === 'timeout') {
            message = 'Request timed out. The server may be busy.';
            details = `Timeout after ${CONFIG.TIMEOUT_MS / 1000} seconds\nAttempts made: ${currentRetryAttempt + 1}/${CONFIG.MAX_RETRIES}`;
        } else if (errorInfo.type === 'validation') {
            message = 'There was an issue with your booking information.';
            details = errorInfo.details || 'Please check all fields and try again.';
        } else if (errorInfo.type === 'server') {
            message = 'Server error occurred. Our team has been notified.';
            details = `Error code: ${errorInfo.status || 'Unknown'}\nTime: ${new Date().toLocaleTimeString()}`;
        }
        
        errorMessage.textContent = message;
        errorDetails.textContent = details;
        errorDetails.style.display = details ? 'block' : 'none';
        
        document.getElementById('errorScreen').classList.remove('hidden');
        document.getElementById('errorScreen').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error showing error screen:', error);
        alert('A critical error occurred. Please refresh the page and try again.');
    }
}

function retryBooking() {
    try {
        if (lastBookingData && currentRetryAttempt < CONFIG.MAX_RETRIES - 1) {
            currentRetryAttempt++;
            document.getElementById('errorScreen').classList.add('hidden');
            submitBookingData(lastBookingData);
        } else {
            // Reset and show form
            currentRetryAttempt = 0;
            lastBookingData = null;
            document.getElementById('errorScreen').classList.add('hidden');
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('successScreen').classList.add('hidden');
            document.getElementById('bookingForm').classList.remove('hidden');
            document.getElementById('bookingForm').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Error retrying booking:', error);
        showAlert('Error retrying booking. Please refresh the page.', 'error');
    }
}

function contactSupport() {
    try {
        const subject = 'Booking System Error - Need Assistance';
        const body = `Hello,

I encountered an error while trying to book a call on your website.

Error Details:
- Time: ${new Date().toLocaleString()}
- Booking ID (if generated): ${lastBookingData?.bookingId || 'Not generated'}
- Error occurred after ${currentRetryAttempt + 1} attempts

Please assist me with completing my booking.

Thank you!`;
        
        const mailtoLink = `mailto:support@traderbrothers.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    } catch (error) {
        console.error('Error opening email client:', error);
        showAlert('Please email support@traderbrothers.com for assistance.', 'warning');
    }
}

// ===== NETWORK FUNCTIONS =====
async function submitWithTimeout(url, options, timeout) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
        )
    ]);
}

async function submitBookingData(bookingData) {
    try {
        showLoadingScreen();
        
        const response = await submitWithTimeout(CONFIG.MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(bookingData)
        }, CONFIG.TIMEOUT_MS);

        if (response.ok) {
            showSuccessScreen(bookingData);
        } else {
            throw new Error(`Server error: ${response.status}`);
        }

    } catch (error) {
        console.error('Booking submission error:', error);
        
        let errorInfo = { type: 'network' };
        
        if (error.message === 'Timeout') {
            errorInfo.type = 'timeout';
        } else if (error.message.includes('Server error:')) {
            errorInfo.type = 'server';
            errorInfo.status = error.message.split(':')[1]?.trim();
        } else if (!navigator.onLine) {
            errorInfo.type = 'network';
            errorInfo.details = 'No internet connection detected';
        }
        
        // Retry logic
        if (currentRetryAttempt < CONFIG.MAX_RETRIES - 1 && errorInfo.type !== 'validation') {
            currentRetryAttempt++;
            setTimeout(() => submitBookingData(bookingData), 2000 * currentRetryAttempt);
        } else {
            showErrorScreen(errorInfo);
        }
    }
}

// ===== MAIN FORM SUBMISSION =====
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    try {
        // Disable submit button to prevent double submission
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        // Validate all fields
        const isNameValid = validateName();
        const isDateValid = validateDate();
        const isTimeValid = validateTime();
        const isCallTypeValid = validateCallType();
        const isPhoneValid = validatePhone();

        if (!isNameValid || !isDateValid || !isTimeValid || !isCallTypeValid || !isPhoneValid) {
            showAlert('Please correct the errors above before submitting.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Booking';
            return;
        }

        // Prepare booking data with sanitized inputs
        const bookingId = generateBookingId();
        const name = sanitizeInput(document.getElementById('name').value.trim());
        const date = document.getElementById('dateInput').value;
        const time = document.getElementById('time').value;
        
        let phoneNumber = null;
        if (selectedCallType === 'mobile') {
            phoneNumber = phoneConfirmed ? 
                detectedPhoneNumber : 
                sanitizeInput(document.getElementById('customPhone').value.trim());
        }

        const bookingData = {
            bookingId: bookingId,
            name: name,
            date: date,
            time: time,
            callType: selectedCallType,
            phoneNumber: phoneNumber,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct'
        };

        // Store for retry attempts
        lastBookingData = bookingData;
        currentRetryAttempt = 0;

        // Submit the booking
        await submitBookingData(bookingData);

    } catch (error) {
        console.error('Form submission error:', error);
        showErrorScreen({ type: 'validation', details: error.message });
    } finally {
        // Re-enable submit button
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Booking';
    }
});

// ===== ADDITIONAL ERROR HANDLING =====

// Handle network status changes
window.addEventListener('online', function() {
    showAlert('Internet connection restored.', 'success');
});

window.addEventListener('offline', function() {
    showAlert('Internet connection lost. Please check your network.', 'warning');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showAlert('An unexpected error occurred. Please try again.', 'error');
    event.preventDefault();
});

// Handle general JavaScript errors
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
    showAlert('A system error occurred. Please refresh the page if issues persist.', 'error');
});

console.log('Enhanced booking calendar loaded with comprehensive error handling');
