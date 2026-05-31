import { Box } from '@mui/material'

export function RoundedContainer(props: { title: string; children?: JSX.Element | JSX.Element[] }) {
    const { title, children } = props
    return (
        <Box
            flex={1}
            border={'1px solid black'}
            borderRadius={2}
            overflow={'hidden'}
            boxShadow={2}
            position={'relative'}
        >
            <Box
                bgcolor={'#1976d2'}
                color={'white'}
                paddingLeft={2}
                paddingTop={1}
                paddingBottom={1}
                fontWeight={'bold'}
            >
                {title}
            </Box>
            <Box padding={2}>{children}</Box>
        </Box>
    )
}
