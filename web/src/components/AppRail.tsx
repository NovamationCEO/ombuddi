import {
    AdminPanelSettingsRounded,
    AssessmentRounded,
    BusinessRounded,
    FolderRounded,
    HomeRounded,
    ManageAccountsRounded,
    PersonRounded,
} from '@mui/icons-material'
import { Box, ButtonBase, Tooltip, useMediaQuery, useTheme } from '@mui/material'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import mascot from '../assets/images/mascot.png'
import { institutionalPalette as palette } from '../theme/institutionalPalette'
import { useCurrentOmbuds } from '../tools/useCurrentOmbuds'
import { AccountButton } from './AccountButton'

type RailLinkProps = {
    icon: ReactNode
    label: string
    path: string
    selected: boolean
}

function RailLink({ icon, label, path, selected }: RailLinkProps) {
    const navigate = useNavigate()

    return (
        <Tooltip
            title={label}
            placement="right"
        >
            <ButtonBase
                aria-label={label}
                aria-current={selected ? 'page' : undefined}
                onClick={() => navigate(path)}
                sx={{
                    width: { xs: 52, md: 48 },
                    height: { xs: 52, md: 48 },
                    borderRadius: 2.5,
                    color: selected ? palette.text : palette.muted,
                    bgcolor: selected ? 'action.selected' : 'transparent',
                    transition: 'background-color 160ms ease, color 160ms ease',
                    '&:hover': {
                        color: palette.text,
                        bgcolor: selected ? 'action.selected' : 'action.hover',
                    },
                    '& .MuiSvgIcon-root': { fontSize: 24 },
                }}
            >
                {icon}
            </ButtonBase>
        </Tooltip>
    )
}

export function AppRail() {
    const location = useLocation()
    const navigate = useNavigate()
    const theme = useTheme()
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
    const currentOmbuds = useCurrentOmbuds()
    const primaryLinks = [
        { label: 'Home', path: '/', icon: <HomeRounded /> },
        { label: 'Cases', path: '/cases', icon: <FolderRounded /> },
        { label: 'Reports', path: '/report', icon: <AssessmentRounded /> },
    ]
    const secondaryLinks = [
        { label: 'Profile', path: '/profile', icon: <PersonRounded /> },
        { label: 'Organization Settings', path: '/organization', icon: <BusinessRounded /> },
    ]
    const adminLinks = [
        ...(currentOmbuds.data?.isAdmin
            ? [{ label: 'Manage Users', path: '/admin/users', icon: <ManageAccountsRounded /> }]
            : []),
        ...(currentOmbuds.data?.isSystemAdmin
            ? [{ label: 'System Administration', path: '/system/orgs', icon: <AdminPanelSettingsRounded /> }]
            : []),
    ]

    const renderLinks = (links: typeof primaryLinks) =>
        links.map((link) => {
            const selected = link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path)
            return (
                <RailLink
                    key={link.path}
                    {...link}
                    selected={selected}
                />
            )
        })

    return (
        <Box
            component="nav"
            aria-label="Primary navigation"
            sx={{
                width: { xs: '100%', md: 76 },
                height: { xs: 64, md: '100%' },
                flexShrink: 0,
                order: { xs: 2, md: 0 },
                px: { xs: 1.5, md: 1.25 },
                py: { xs: 0.75, md: 2 },
                display: 'flex',
                flexDirection: { xs: 'row', md: 'column' },
                alignItems: 'center',
                justifyContent: { xs: 'space-around', md: 'flex-start' },
                gap: { xs: 0.5, md: 1 },
                boxSizing: 'border-box',
                bgcolor: palette.backgroundDeep,
                borderRight: { md: `1px solid ${palette.border}` },
                borderTop: { xs: `1px solid ${palette.border}`, md: 0 },
                zIndex: 20,
            }}
        >
            <ButtonBase
                aria-label="Ombuddi Home"
                onClick={() => navigate('/')}
                sx={{
                    width: 44,
                    height: 44,
                    mb: { xs: 0, md: 2.25 },
                    display: { xs: 'none', md: 'grid' },
                    placeItems: 'center',
                    overflow: 'hidden',
                    borderRadius: 2.5,
                    bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.18)',
                    border: '1px solid rgba(var(--mui-palette-primary-mainChannel) / 0.28)',
                }}
            >
                <Box
                    component="img"
                    src={mascot}
                    alt=""
                    sx={{ width: 38, height: 38, objectFit: 'contain' }}
                />
            </ButtonBase>

            <Box
                sx={{
                    flex: { xs: 1, md: '0 1 auto' },
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'column' },
                    alignItems: 'center',
                    gap: { xs: 0.5, md: 1 },
                    overflowX: { xs: 'auto', md: 'visible' },
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                {renderLinks(primaryLinks)}

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'row', md: 'column' },
                        alignItems: 'center',
                        gap: { xs: 0.5, md: 1 },
                        ml: { xs: 0.75, md: 0 },
                        mt: { xs: 0, md: 0.75 },
                        pl: { xs: 0.75, md: 0 },
                        pt: { xs: 0, md: 0.75 },
                        borderLeft: { xs: `1px solid ${palette.border}`, md: 0 },
                        borderTop: { xs: 0, md: `1px solid ${palette.border}` },
                    }}
                >
                    {renderLinks(secondaryLinks)}
                </Box>

                {adminLinks.length > 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'row', md: 'column' },
                            alignItems: 'center',
                            gap: { xs: 0.5, md: 1 },
                            ml: { xs: 0.75, md: 0 },
                            mt: { xs: 0, md: 0.75 },
                            pl: { xs: 0.75, md: 0 },
                            pt: { xs: 0, md: 0.75 },
                            borderLeft: { xs: `1px solid ${palette.border}`, md: 0 },
                            borderTop: { xs: 0, md: `1px solid ${palette.border}` },
                        }}
                    >
                        {renderLinks(adminLinks)}
                    </Box>
                )}
            </Box>

            <Box
                sx={{
                    flexShrink: 0,
                    mt: { xs: 0, md: 'auto' },
                    ml: { xs: 0.75, md: 0 },
                    '& > div': {
                        borderColor: 'primary.light',
                        bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.16)',
                    },
                    '& .MuiIconButton-root': { color: palette.purpleLight },
                }}
            >
                <AccountButton placement={isDesktop ? 'right-end' : 'top-end'} />
            </Box>
        </Box>
    )
}
