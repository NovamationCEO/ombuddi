import { ListItemIcon, ListItemText, MenuItem, SvgIconTypeMap } from '@mui/material'
import { OverridableComponent } from '@mui/material/OverridableComponent'
import { useNavigate } from 'react-router-dom'

export function SidebarLink(props: {
    address: string
    Icon: OverridableComponent<SvgIconTypeMap<object, 'svg'>> & {
        muiName: string
    }
    label: string
}) {
    const { address, Icon, label } = props
    const navigate = useNavigate()

    return (
        <MenuItem onClick={() => navigate(address)}>
            <ListItemIcon>
                <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
        </MenuItem>
    )
}
