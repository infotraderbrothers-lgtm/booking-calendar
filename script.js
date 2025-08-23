let selectedCallType = null;
let phoneConfirmed = null;
let detectedPhoneNumber = null;
let bookingTimeout = null;
let currentBookingData = null;

// Configuration - Update these values for your setup
const CONFIG = {
    webhookUrl: 'https://hook.eu2.make.com/969nskx4hbgd2nn4wh1p4a15rh0630v1',
    confirmationUrl: 'https://your-confirmation-endpoint.com/confirm', // Replace with your actual endpoint
    bearerToken: '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', // Replace with your actual bearer token
    timeoutDuration: 45000, // 45 seconds
    retryAttempts: 3,
    retryDelay: 2000 // 2 seconds
};

// Set minimum date to today
document.getElementById('dateInput').min = new Date().toISOString().split('T')[0];

// Generate unique booking ID
function generateBookingId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `TB-${timestamp}-${random}`;
}

// HTTP POST request with bearer token authentication
async function sendHttpPostWithAuth(url, data, bearerToken) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // Add bearer token if provided
    if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
}

// Setup confirmation listener for HTTP POST requests
function setupConfirmationListener() {
    console.log('Setting up confirmation listener...');
    
    // Create a global endpoint function for external systems to call
    window.confirmBookingDirectly = function(confirmationData) {
        console.log('Direct confirmation received:', confirmationData);
        
        if (validateConfirmationData(confirmationData)) {
            handleConfirmation(confirmationData);
            return { success: true, message: 'Confirmation processed' };
        } else {
            console.error('Invalid confirmation data:', confirmationData);
            return { success: false, error: 'Invalid confirmation data' };
        }
    };

    // Listen for postMessage events (fallback method)
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'booking_confirmation') {
            console.log('PostMessage confirmation received:', event.data);
            handleConfirmation(event.data);
        }
    });
}

// Validate confirmation data
function validateConfirmationData(data) {
    return data && 
           (data.bookingId || data.booking_id) && 
           data.name;
}

// Handle confirmation from any source
function handleConfirmation(data) {
    console.log('Processing confirmation:', data);
    
    // Clear timeout if active
    if (bookingTimeout) {
        clearTimeout(bookingTimeout);
        bookingTimeout = null;
    }
    
    const bookingId = data.bookingId || data.booking_id;
    
    // Validate this confirmation matches our current booking
    if (currentBookingData && bookingId !== currentBookingData.bookingId) {
        console.warn('Booking ID mismatch. Expected:', currentBookingData.bookingId, 'Got:', bookingId);
        return;
    }
    
    // Hide loading screen
    document.getElementById('loadingScreen').classList.add('hidden');
    
    // Update booking data with confirmation info
    if (currentBookingData) {
        currentBookingData.confirmedName = data.name;
        currentBookingData.status = data.status || 'confirmed';
        currentBookingData.confirmationMessage = data.message;
        currentBookingData.confirmedAt = new Date().toISOString();
    }
    
    // Show appropriate screen based on status
    if (data.status === 'error' || data.status === 'failed') {
        showErrorMessage(data.message || 'Booking confirmation failed');
    } else {
        showSuccessMessage(currentBookingData || {
            bookingId: bookingId,
            name: data.name,
            status: data.status || 'confirmed',
            confirmationMessage: data.message
        });
    }
}

// Send confirmation request with retry logic
async function requestConfirmationWithRetry(bookingId, attempt = 1) {
    try {
        console.log(`Requesting confirmation (attempt ${attempt}/${CONFIG.retryAttempts}):`, bookingId);
        
        const confirmationPayload = {
            bookingId: bookingId,
            action: 'request_confirmation',
            timestamp: new Date().toISOString(),
            attempt: attempt
        };

        const response = await sendHttpPostWithAuth(
            CONFIG.confirmationUrl, 
            confirmationPayload, 
            CONFIG.bearerToken
        );

        const result = await response.json();
        console.log('Confirmation request response:', result);

        // If the response contains confirmation data, process it immediately
        if (result.confirmed && validateConfirmationData(result)) {
            handleConfirmation(result);
            return true;
        }

        return false; // Continue waiting for async confirmation

    } catch (error) {
        console.error(`Confirmation request failed (attempt ${attempt}):`, error);
        
        if (attempt < CONFIG.retryAttempts) {
            console.log(`Retrying in ${CONFIG.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
            return requestConfirmationWithRetry(bookingId, attempt + 1);
        }
        
        throw error;
    }
}

// Wait for confirmation with timeout
async function waitForConfirmation(bookingId) {
    return new Promise(async (resolve, reject) => {
        console.log('Waiting for confirmation:', bookingId);
        
        // Set timeout
        bookingTimeout = setTimeout(() => {
            console.log('Confirmation timeout reached');
            reject(new Error('Booking confirmation timeout'));
        }, CONFIG.timeoutDuration);
        
        try {
            // Try to request confirmation immediately if endpoint is configured
            if (CONFIG.confirmationUrl !== 'https://your-confirmation-endpoint.com/confirm') {
                const immediateConfirm = await requestConfirmationWithRetry(bookingId);
                
                if (immediateConfirm) {
                    clearTimeout(bookingTimeout);
                    resolve({ success: true });
                    return;
                }
            }
            
            // If no immediate confirmation, wait for external confirmation
            const originalHandler = window.confirmBookingDirectly;
            window.confirmBookingDirectly = function(data) {
                const bookingIdFromData = data.bookingId || data.booking_id;
                if (!bookingIdFromData || bookingIdFromData === bookingId) {
                    clearTimeout(bookingTimeout);
                    window.confirmBookingDirectly = originalHandler; // Restore original
                    resolve({ success: true, data: data });
                } else {
                    console.log('Confirmation ID mismatch, ignoring');
                }
            };
            
        } catch (error) {
            clearTimeout(bookingTimeout);
            reject(error);
        }
    });
}

// Simulate phone number detection
function detectPhoneNumber() {
    const mockNumbers = [
        '+1 (555) 123-4567',
        '+44 7700 900123',
        '+1 (555) 987-6543'
    ];
    return mockNumbers[Math.floor(Math.random() * mockNumbers.length)];
}

function selectCallType(type) {
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
    
    selectedOption.classList.add('selected');
    document.getElementById(type === 'video' ? 'videoCall' : 'mobileCall').checked = true;
    selectedCallType = type;

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
}

function confirmPhone(isCorrect) {
    // Reset confirmation buttons
    document.querySelectorAll('.confirmation-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Select clicked button
    const buttons = document.querySelectorAll('.confirmation-btn');
    if (isCorrect) {
        buttons[0].classList.add('selected');
        document.getElementById('customPhoneSection').classList.add('hidden');
    } else {
        buttons[1].classList.add('selected');
        document.getElementById('customPhoneSection').classList.remove('hidden');
    }
    
    phoneConfirmed = isCorrect;
}

// Main form submission handler
document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Form submission started');

    // Validate form
    const name = document.getElementById('name').value.trim();
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('time').value;

    if (!name || !date || !time || !selectedCallType) {
        alert('Please fill in all required fields.');
        return;
    }

    if (selectedCallType === 'mobile' && phoneConfirmed === null) {
        alert('Please confirm your phone number.');
        return;
    }

    if (selectedCallType === 'mobile' && phoneConfirmed === false) {
        const customPhone = document.getElementById('customPhone').value.trim();
        if (!customPhone) {
            alert('Please enter your phone number.');
            return;
        }
    }

    // Generate unique booking ID
    const bookingId = generateBookingId();
    console.log('Generated booking ID:', bookingId);

    // Prepare booking data
    const phoneNumber = selectedCallType === 'mobile' ? 
        (phoneConfirmed ? detectedPhoneNumber : document.getElementById('customPhone').value) : null;

    currentBookingData = {
        bookingId: bookingId,
        name: name,
        date: date,
        time: time,
        callType: selectedCallType,
        phoneNumber: phoneNumber,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    console.log('Booking data prepared:', currentBookingData);

    try {
        // Show loading screen
        document.getElementById('bookingForm').style.display = 'none';
        document.getElementById('errorScreen').classList.add('hidden');
        document.getElementById('successMessage').classList.add('hidden');
        document.getElementById('loadingScreen').classList.remove('hidden');
        document.getElementById('loadingBookingId').textContent = bookingId;
        document.getElementById('loadingScreen').scrollIntoView({ behavior: 'smooth' });

        // Submit to Make.com webhook
        console.log('Submitting to webhook:', CONFIG.webhookUrl);
        
        const webhookResponse = await sendHttpPostWithAuth(
            CONFIG.webhookUrl, 
            currentBookingData, 
            CONFIG.bearerToken
        );

        console.log('Webhook response status:', webhookResponse.status);

        if (webhookResponse.ok) {
            console.log('Webhook submitted successfully, waiting for confirmation...');
            
            try {
                // Wait for confirmation
                await waitForConfirmation(bookingId);
                console.log('Confirmation process completed successfully');
                
            } catch (confirmationError) {
                console.error('Confirmation timeout or error:', confirmationError);
                document.getElementById('loadingScreen').classList.add('hidden');
                showErrorScreen(bookingId);
            }
        } else {
            const errorText = await webhookResponse.text();
            console.error('Webhook failed:', webhookResponse.status, errorText);
            throw new Error(`Webhook failed: ${webhookResponse.status}`);
        }
    } catch (error) {
        console.error('Booking error:', error);
        document.getElementById('loadingScreen').classList.add('hidden');
        showErrorScreen(bookingId || 'Unknown');
    }
});

function showErrorScreen(bookingId) {
    document.getElementById('errorBookingId').textContent = 
        bookingId ? `Reference ID: ${bookingId}` : '';
    document.getElementById('errorScreen').classList.remove('hidden');
    document.getElementById('errorScreen').scrollIntoView({ behavior: 'smooth' });
}

function showErrorMessage(message) {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
    
    let errorDiv = document.getElementById('customErrorMessage');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'customErrorMessage';
        errorDiv.className = 'error-screen';
        document.querySelector('.container').appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <h3>Booking Error</h3>
        <p>${message}</p>
        <div style="margin: 16px 0; font-size: 14px; opacity: 0.9;">
            ${currentBookingData ? `Reference ID: ${currentBookingData.bookingId}` : ''}
        </div>
        <button class="retry-btn" onclick="retryBooking()">Try Again</button>
    `;
    
    errorDiv.classList.remove('hidden');
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

function retryBooking() {
    console.log('Retrying booking...');
    
    // Clear timeout
    if (bookingTimeout) {
        clearTimeout(bookingTimeout);
        bookingTimeout = null;
    }
    
    // Reset screens
    document.getElementById('errorScreen').classList.add('hidden');
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
    
    const customErrorDiv = document.getElementById('customErrorMessage');
    if (customErrorDiv) {
        customErrorDiv.classList.add('hidden');
    }
    
    // Reset booking data
    currentBookingData = null;
    
    // Show form
    document.getElementById('bookingForm').style.display = 'block';
    document.getElementById('bookingForm').scrollIntoView({ behavior: 'smooth' });
}

function showSuccessMessage(bookingData, confirmationData = null) {
    console.log('Showing success message');
    
    const successDiv = document.getElementById('successMessage');
    const detailsDiv = document.getElementById('bookingDetails');
    
    // Format date and time
    let formattedDate = 'Date not specified';
    if (bookingData.date) {
        try {
            formattedDate = new Date(bookingData.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            formattedDate = bookingData.date;
        }
    }

    let formattedTime = 'Time not specified';
    if (bookingData.time) {
        try {
            const timeObj = new Date(`2000-01-01T${bookingData.time}`);
            formattedTime = timeObj.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            formattedTime = bookingData.time;
        }
    }

    detailsDiv.innerHTML = `
        <p><strong>Booking ID:</strong> <span class="booking-id">${bookingData.bookingId}</span></p>
        <p><strong>Name:</strong> ${bookingData.confirmedName || bookingData.name}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${formattedTime}</p>
        <p><strong>Call Type:</strong> ${bookingData.callType === 'video' ? 'Video Call' : bookingData.callType === 'mobile' ? 'Mobile Call' : bookingData.callType}</p>
        ${bookingData.phoneNumber ? `<p><strong>Phone:</strong> ${bookingData.phoneNumber}</p>` : ''}
        ${bookingData.confirmationMessage ? `<p><strong>Status:</strong> ${bookingData.confirmationMessage}</p>` : ''}
        ${bookingData.confirmedAt ? `<p><strong>Confirmed At:</strong> ${new Date(bookingData.confirmedAt).toLocaleString()}</p>` : ''}
    `;

    successDiv.classList.remove('hidden');
    successDiv.scrollIntoView({ behavior: 'smooth' });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking form initializing...');
    setupConfirmationListener();
    console.log('Booking form ready with bearer token authentication');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (bookingTimeout) clearTimeout(bookingTimeout);
});

// External API functions for testing and integration
window.testBookingSuccess = function(bookingId = null) {
    const testData = {
        bookingId: bookingId || (currentBookingData ? currentBookingData.bookingId : 'TEST-' + Date.now()),
        name: 'Test User',
        status: 'confirmed',
        message: 'Test booking confirmed successfully'
    };
    
    return window.confirmBookingDirectly(testData);
};

window.testBookingError = function(bookingId = null, message = 'Test error message') {
    const testData = {
        bookingId: bookingId || (currentBookingData ? currentBookingData.bookingId : 'TEST-' + Date.now()),
        name: 'Test User',
        status: 'error',
        message: message
    };
    
    return window.confirmBookingDirectly(testData);
};

// Manual confirmation function for external systems
window.confirmBookingManually = function(bookingId, status = 'confirmed', message = 'Booking confirmed') {
    if (!currentBookingData) {
        console.error('No active booking to confirm');
        return { success: false, error: 'No active booking' };
    }
    
    return window.confirmBookingDirectly({
        bookingId: bookingId,
        name: currentBookingData.name,
        status: status,
        message: message
    });
};
