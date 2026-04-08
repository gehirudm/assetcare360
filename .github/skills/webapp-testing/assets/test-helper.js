const fs = require('fs');
const path = require('path');

const DEFAULT_TIMEOUT = 15000;

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function timestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        '-',
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds())
    ].join('');
}

async function ensureServerReachable(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { method: 'GET', signal: controller.signal });
        return {
            ok: response.ok,
            status: response.status
        };
    } finally {
        clearTimeout(timer);
    }
}

function attachBrowserLogging(page, logStore) {
    page.on('console', (msg) => {
        logStore.console.push({
            type: msg.type(),
            text: msg.text()
        });
    });

    page.on('requestfailed', (request) => {
        logStore.network.push({
            url: request.url(),
            method: request.method(),
            failure: request.failure() ? request.failure().errorText : 'unknown'
        });
    });
}

async function waitForVisible(page, selector, timeout = DEFAULT_TIMEOUT) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
}

async function safeClick(page, selector, timeout = DEFAULT_TIMEOUT) {
    await waitForVisible(page, selector, timeout);
    await page.click(selector, { timeout });
}

async function safeFill(page, selector, text, timeout = DEFAULT_TIMEOUT) {
    await waitForVisible(page, selector, timeout);
    await page.fill(selector, String(text), { timeout });
}

async function assertTextVisible(page, text, timeout = DEFAULT_TIMEOUT) {
    await page.getByText(text, { exact: false }).waitFor({ state: 'visible', timeout });
}

async function captureScreenshot(page, artifactsDir, prefix = 'debug') {
    ensureDir(artifactsDir);
    const fileName = `${prefix}-${timestamp()}.png`;
    const filePath = path.join(artifactsDir, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
}

async function withFailureArtifacts(page, artifactsDir, label, action) {
    try {
        return await action();
    } catch (error) {
        const screenshot = await captureScreenshot(page, artifactsDir, label || 'failure');
        error.message = `${error.message}\nScreenshot: ${screenshot}`;
        throw error;
    }
}

module.exports = {
    DEFAULT_TIMEOUT,
    ensureDir,
    ensureServerReachable,
    attachBrowserLogging,
    waitForVisible,
    safeClick,
    safeFill,
    assertTextVisible,
    captureScreenshot,
    withFailureArtifacts
};
