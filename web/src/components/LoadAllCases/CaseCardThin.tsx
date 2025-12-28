import { Box, Typography } from '@mui/material'
import { RoundButton } from '../../trusted-components/RoundButton'
import { CaseCardWrapper } from './CaseCardWrapper'
import { useNavigate } from 'react-router-dom'
import { ReactElement } from 'react'

export function CaseCardThin(props: { Icon: ReactElement; text: string; link: string }) {
    const { Icon, text, link } = props
    const navigate = useNavigate()
    return (
        <CaseCardWrapper onClick={() => navigate(link)}>
            <Box
                display={'flex'}
                alignItems={'center'}
                flex={1}
                height={'100%'}
            >
                <Box m={2}>
                    <RoundButton size={41}>{Icon}</RoundButton>
                </Box>
                <Typography variant="h6">{text}</Typography>
            </Box>
        </CaseCardWrapper>
    )
}
