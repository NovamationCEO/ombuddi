import { Box, Stack } from '@mui/material'
import monster from '../assets/images/monster.png'
import Grid2 from '@mui/material/Unstable_Grid2'
import { useNavigate } from 'react-router-dom'
import img1 from '../assets/images/add_entry.png'
import img2 from '../assets/images/cases.png'
import img3 from '../assets/images/report.png'

type LinkButtonType = { name: string; url: string; image: any; description: string }

export function HomePage() {
    const navigate = useNavigate()

    const linkData: LinkButtonType[] = [
        { name: 'Add Entry', url: '/add_entry', image: img1, description: 'Record a Meeting or Contact' },
        { name: 'Cases', url: '/cases', image: img2, description: 'View Active Cases' },
        { name: 'Report', url: '/report', image: img3, description: 'Generate A Yearly Report' },
    ]

    function LinkButton(props: LinkButtonType) {
        const { name, url, image, description } = props
        return (
            <Grid2
                xs={12}
                sm={6}
                md={4}
                display={'flex'}
            >
                <Box
                    border={'1px solid black'}
                    borderRadius={2}
                    onClick={() => navigate(url)}
                    textAlign={'center'}
                    overflow={'hidden'}
                    sx={{
                        cursor: 'pointer',
                        filter: 'sepia(1)',
                        '&:hover': { backgroundColor: '#f0f0f0', filter: 'sepia(0)' },
                    }}
                >
                    <Stack spacing={2}>
                        <img
                            src={image}
                            width={'100%'}
                        />
                        <Box
                            fontSize={'large'}
                            fontWeight={'bold'}
                        >
                            {name}
                        </Box>
                        <Box
                            p={1}
                            mb={1}
                        >
                            {description}
                        </Box>
                    </Stack>
                </Box>
            </Grid2>
        )
    }

    return (
        <Box>
            <Box
                position={'absolute'}
                right={20}
                top={50}
            >
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
    )
}
