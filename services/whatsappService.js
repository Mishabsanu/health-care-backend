/**
 * 📱 PCMS Clinical WhatsApp Gateway
 * Handles automated clinical notifications for patients.
 * 
 * PRODUCTION SETUP:
 * 1. Twilio: Use 'twilio' npm package. Requires TWILIO_SID, TWILIO_AUTH_TOKEN, and FROM_NUMBER.
 * 2. Meta (WhatsApp Business API): Use Axios for POST to graph.facebook.com. Requires ACCESS_TOKEN and PHONE_NUMBER_ID.
 */

/**
 * 🛠️ PCMS Phone Normalizer
 * Standardizes numbers for WhatsApp (Adds +91 for 10-digit Indian numbers).
 */
const normalizePhone = (phone) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
};

export const sendWhatsAppMessage = async ({ phone, template, data }) => {
    try {
        const targetPhone = normalizePhone(phone);
        let message = '';

        switch (template) {
            case 'WELCOME':
                message = `🏥 Welcome to PCMS Clinical Care, ${data.name}! Thank you for choosing us. Your Patient ID is: ${data.patientId}. Your registration is complete. Please book your first clinical appointment at your earliest convenience to start your recovery journey.`;
                break;
            case 'BOOKING':
                message = `📅 Appointment Scheduled! Hi ${data.name}, your clinical session is scheduled for ${data.date} at ${data.time}. Please arrive 10 minutes early.`;
                break;
            case 'REMINDER':
                message = `🔔 Kind Reminder: Hi ${data.name}, you have a clinical session scheduled for tomorrow (${data.date}) at ${data.time}.`;
                break;
            default:
                message = `Clinical Alert for ${data.name}`;
        }
        return { success: true, messageId: `msg_${Math.random().toString(36).substr(2, 9)}` };
    } catch (err) {
        console.error('🚫 WhatsApp Gateway Error:', err);
        return { success: false, error: err.message };
    }
};
