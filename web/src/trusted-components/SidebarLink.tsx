import { Box, ListItemIcon, ListItemText, MenuItem, SvgIconTypeMap, lighten } from '@mui/material'
import { OverridableComponent } from '@mui/material/OverridableComponent'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStyles } from '../tools/useStyles'

export function SidebarLink(props: {
    address: string
    Icon: OverridableComponent<SvgIconTypeMap<object, 'svg'>> & {
        muiName: string
    }
    label: string
}) {
    const { address, Icon, label } = props
    const navigate = useNavigate()
    const style = useStyles()

    const location = useLocation()
    const path = location.pathname

    return (
        <MenuItem
            onClick={() => navigate(address)}
            sx={{
                bgcolor: path === address ? style.header.bgcolor : 'transparent',
                borderRadius: 1,
                '&:hover': {
                    bgcolor: lighten(style.header.bgcolor, 0.4),
                },
            }}
        >
            <ListItemIcon>
                <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
                <Box fontSize={'small'}>{label}</Box>
            </ListItemText>
        </MenuItem>
    )
}
