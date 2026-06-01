import { Box, Button, ButtonGroup } from '@mui/material'

export function RoundedButtonGroup(props: {
    titles: string[]
    activeTab: number
    setActiveTab: (index: number) => void
}) {
    const { titles, activeTab, setActiveTab } = props

    function TabButton(props: { title: string; index: number }) {
        return (
            <Button
                variant={props.index === activeTab ? 'contained' : 'outlined'}
                onClick={() => setActiveTab(props.index)}
            >
                {props.title}
            </Button>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flex: 1,
                justifyContent: 'center'
            }}>
            <ButtonGroup
                variant="outlined"
                sx={{
                    overflow: 'hidden',
                    '& > button:first-of-type': {
                        borderTopLeftRadius: 16,
                        borderBottomLeftRadius: 16,
                    },
                    '& > button:last-of-type': {
                        borderTopRightRadius: 16,
                        borderBottomRightRadius: 16,
                    },
                    '& .MuiButton-outlined': {
                        bgcolor: 'white',
                        '&:hover': {
                            bgcolor: 'grey.100',
                        },
                    },
                }}
            >
                {titles.map((title, n) => (
                    <TabButton
                        key={title}
                        title={title}
                        index={n}
                    />
                ))}
            </ButtonGroup>
        </Box>
    );
}
