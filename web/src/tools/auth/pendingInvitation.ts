const pendingInvitationTokenKey = 'ombuddi.pendingInvitationToken'

export function loadPendingInvitationToken() {
    const urlToken = new URLSearchParams(window.location.search).get('token')?.trim() ?? ''
    if (urlToken) {
        try {
            window.sessionStorage.setItem(pendingInvitationTokenKey, urlToken)
        } catch {
            // Auth0 appState still carries the URL token if storage is unavailable.
        }
        return urlToken
    }

    return getStoredInvitationToken()
}

export function getStoredInvitationToken() {
    try {
        return window.sessionStorage.getItem(pendingInvitationTokenKey)?.trim() ?? ''
    } catch {
        return ''
    }
}

export function clearPendingInvitationToken() {
    try {
        window.sessionStorage.removeItem(pendingInvitationTokenKey)
    } catch {
        // The token also disappears when the browser session ends.
    }
}
