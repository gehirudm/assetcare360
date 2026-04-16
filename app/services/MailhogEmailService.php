<?php

class MailhogEmailService {
    private string $host;
    private int $port;
    private string $fromEmail;
    private string $fromName;
    private string $heloDomain;
    private int $timeoutSeconds;

    public function __construct() {
        $this->host = MAILHOG_SMTP_HOST;
        $this->port = MAILHOG_SMTP_PORT;
        $this->fromEmail = MAILHOG_FROM_EMAIL;
        $this->fromName = MAILHOG_FROM_NAME;
        $this->heloDomain = MAILHOG_HELO_DOMAIN;
        $this->timeoutSeconds = max(1, MAILHOG_TIMEOUT_SECONDS);
    }

    public function send(string $toEmail, string $subject, string $htmlBody, string $toName = ''): bool {
        if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            error_log('[email-consumer] Invalid recipient email: ' . $toEmail);
            return false;
        }

        $socket = @fsockopen($this->host, $this->port, $errno, $errstr, $this->timeoutSeconds);
        if ($socket === false) {
            error_log(sprintf('[email-consumer] MailHog connection failed (%s:%d): %s (%d)', $this->host, $this->port, $errstr, $errno));
            return false;
        }

        stream_set_timeout($socket, $this->timeoutSeconds);

        try {
            $this->expectCode($socket, [220]);
            $this->sendCommand($socket, 'EHLO ' . $this->heloDomain, [250]);
            $this->sendCommand($socket, 'MAIL FROM:<' . $this->fromEmail . '>', [250]);
            $this->sendCommand($socket, 'RCPT TO:<' . $toEmail . '>', [250, 251]);
            $this->sendCommand($socket, 'DATA', [354]);

            $payload = $this->buildMessagePayload($toEmail, $toName, $subject, $htmlBody);
            fwrite($socket, $payload . "\r\n.\r\n");
            $this->expectCode($socket, [250]);

            $this->sendCommand($socket, 'QUIT', [221]);
            fclose($socket);
            return true;
        } catch (Throwable $e) {
            error_log('[email-consumer] MailHog send failed: ' . $e->getMessage());
            fclose($socket);
            return false;
        }
    }

    private function sendCommand($socket, string $command, array $expectedCodes): void {
        fwrite($socket, $command . "\r\n");
        $this->expectCode($socket, $expectedCodes);
    }

    private function expectCode($socket, array $expectedCodes): void {
        [$code, $response] = $this->readResponse($socket);
        if (!in_array($code, $expectedCodes, true)) {
            throw new RuntimeException(sprintf('Unexpected SMTP response code %d. Response: %s', $code, trim($response)));
        }
    }

    private function readResponse($socket): array {
        $response = '';

        while (true) {
            $line = fgets($socket, 1024);
            if ($line === false) {
                $meta = stream_get_meta_data($socket);
                if (!empty($meta['timed_out'])) {
                    throw new RuntimeException('Timed out waiting for SMTP response');
                }
                throw new RuntimeException('Failed to read SMTP response');
            }

            $response .= $line;

            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }

        $code = (int) substr($response, 0, 3);
        return [$code, $response];
    }

    private function buildMessagePayload(string $toEmail, string $toName, string $subject, string $htmlBody): string {
        $from = $this->formatAddress($this->fromEmail, $this->fromName);
        $to = $this->formatAddress($toEmail, $toName);
        $plainText = trim(strip_tags($htmlBody));
        if ($plainText === '') {
            $plainText = 'Please view this email in an HTML-compatible client.';
        }

        $boundary = 'ac360-' . bin2hex(random_bytes(12));

        $headers = [
            'From: ' . $from,
            'To: ' . $to,
            'Subject: ' . $subject,
            'Date: ' . gmdate('D, d M Y H:i:s O'),
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];

        $bodyParts = [
            '--' . $boundary,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            $plainText,
            '--' . $boundary,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            $htmlBody,
            '--' . $boundary . '--',
            '',
        ];

        $raw = implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $bodyParts);

        $normalized = str_replace(["\r\n", "\r"], "\n", $raw);
        $lines = explode("\n", $normalized);

        foreach ($lines as &$line) {
            if (isset($line[0]) && $line[0] === '.') {
                $line = '.' . $line;
            }
        }

        return implode("\r\n", $lines);
    }

    private function formatAddress(string $email, string $name): string {
        $sanitizedName = trim(preg_replace('/[\r\n]+/', ' ', $name));
        if ($sanitizedName === '') {
            return '<' . $email . '>';
        }

        $escapedName = str_replace(['\\', '"'], ['\\\\', '\\"'], $sanitizedName);
        return '"' . $escapedName . '" <' . $email . '>';
    }
}
