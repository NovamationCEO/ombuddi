// Where the gradient's diagonal edge sits, as a percentage across the workspace.
// Case work (the list, a case, and its entries) shares one setting so moving
// through that task does not shift the background. Keep values within a narrow
// band: the gap between any two entries is how far the edge travels.
const CASE_WORK_EDGE = 72
const DEFAULT_EDGE = 70
const GRADIENT_EDGE: Record<string, number> = {
    '/': DEFAULT_EDGE,
    '/cases': CASE_WORK_EDGE,
    '/add_case': 68,
    '/add_person': 65,
    '/report': 67,
    '/profile': 74,
    '/organization': 66,
    '/admin/users': 62,
    '/system/orgs': 69,
}

export function gradientEdge(pathname: string) {
    if (pathname.startsWith('/case/')) return CASE_WORK_EDGE
    return GRADIENT_EDGE[pathname] ?? DEFAULT_EDGE
}
