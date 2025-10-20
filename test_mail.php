<?php
$to = "gehirudm@pm.me";
$subject = "MailHog Test";
$message = "Hello! This is a test email via MailHog.";
$headers = "From: sender@example.com\r\n";

if (mail($to, $subject, $message, $headers)) {
    echo "Mail sent successfully!";
} else {
    echo "Mail failed to send.";
}
