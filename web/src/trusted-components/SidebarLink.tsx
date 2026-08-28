import { Box, ListItemIcon, ListItemText, MenuItem, SvgIconTypeMap } from '@mui/material'
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
                    bgcolor: 'action.hover',
                },
            }}
        >
            <ListItemIcon>
                <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
                <Box sx={{
                    fontSize: 'small'
                }}>{label}</Box>
            </ListItemText>
        </MenuItem>
    );
}
