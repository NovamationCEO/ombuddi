import { Home } from '@mui/icons-material'
import { MenuList, Divider } from '@mui/material'
import { Box } from '@mui/system'
import { SidebarLink } from '../trusted-components/SidebarLink'
import { zIndex } from '../constants/zIndex'
export function NavigationMenu() {
    return (
        <Box
            sx={{
                padding: 1,
                textOverflow: 'wrap',
                zIndex: zIndex.sidenav,
                fontSize: 'small'
            }}>
            <MenuList
                dense
                sx={{
                    '& .MuiMenuItem-root': {
                        whiteSpace: 'normal',
                    },
                }}
            >
                <Box>Sidebar</Box>
                <SidebarLink
                    address={'/welcome'}
                    Icon={Home}
                    label={'Welcome'}
                />
                <SidebarLink
                    address={'/'}
                    Icon={Home}
                    label={'Home'}
                />

                <Divider />
            </MenuList>
        </Box>
    );
}
