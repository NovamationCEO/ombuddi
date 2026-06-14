import { Box, Stack } from '@mui/material'
import monster from '../assets/images/monster.png'
import Grid2 from '@mui/material/Grid'
import { useNavigate } from 'react-router-dom'
// import img1 from '../assets/images/add_entry.png'
import img2 from '../assets/images/cases.png'
import img3 from '../assets/images/report.png'
import img4 from '../assets/images/profile.png'

type LinkButtonType = { name: string; url: string; image: string; description: string }

export function HomePage() {
    const navigate = useNavigate()

    const linkData: LinkButtonType[] = [
        // { name: 'Add Entry', url: '/select_case', image: img1, description: 'Record a Meeting or Entry' },
        { name: 'Cases', url: '/cases', image: img2, description: 'View Active Cases' },
        { name: 'Report', url: '/report', image: img3, description: 'Generate A Yearly Report' },
        { name: 'Profile', url: '/profile', image: img4, description: 'View and Edit Your Profile' },
    ]

    function LinkButton(props: LinkButtonType) {
        const { name, url, image, description } = props
        return (
            <Grid2
                size={{
                    xs: 12,
                    sm: 6,
                    md: 4
                }}
                sx={{
                    display: 'flex'
                }}>
                <Box
                    onClick={() => navigate(url)}
                    sx={{
                        border: '1px solid black',
                        borderRadius: 2,
                        textAlign: 'center',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        filter: 'sepia(1)',
                        '&:hover': { backgroundColor: '#f0f0f0', filter: 'sepia(0)' }
                    }}>
                    <Stack spacing={2}>
                        <img
                            src={image}
                            width={'100%'}
                        />
                        <Box
                            sx={{
                                fontSize: 'large',
                                fontWeight: 'bold'
                            }}>
                            {name}
                        </Box>
                        <Box
                            sx={{
                                p: 1,
                                mb: 1
                            }}>
                            {description}
                        </Box>
                    </Stack>
                </Box>
            </Grid2>
        );
    }

    return (
        <Box sx={{ p: 1 }}>
            <Box
                sx={{
                    position: 'absolute',
                    right: 20,
                    top: 50
                }}>
                <img
                    src={monster}
                    width={100}
                    height={100}
                />
            </Box>
            <Grid2
                container
                spacing={2}
            >
                {linkData.map((data) => {
                    return (
                        <LinkButton
                            key={data.name}
                            {...data}
                        />
                    )
                })}
            </Grid2>
        </Box>
    );
}
