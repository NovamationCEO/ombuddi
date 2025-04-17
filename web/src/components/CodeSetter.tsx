import Grid2 from '@mui/material/Unstable_Grid2'
import { Box } from '@mui/system'
import { MySwitch } from './MySwitch'

export function CodeSetter(props: { activeCodes: string[]; setActiveCodes: (codes: string[]) => void }) {
    const { activeCodes, setActiveCodes } = props

    const codes = [
        ['101', 'Violence'],
        ['102', 'Violins'],
        ['103', 'Supernatural (Werewolves)'],
        ['104', 'Supernatural (Other)'],
        ['105', 'PEBCAC'],
        ['106', 'State Secrets'],
        ['107', 'Other'],
    ]

    return (
        <Grid2 container>
            {codes.map((code) => {
                const isMatch = activeCodes.includes(code[0])
                return (
                    <Grid2
                        xs={12}
                        sm={6}
                        lg={4}
                        xl={3}
                        key={code[0]}
                    >
                        <MySwitch
                            value={isMatch}
                            setValue={(b) => {
                                if (b) {
                                    setActiveCodes([...activeCodes, code[0]])
                                } else {
                                    setActiveCodes(activeCodes.filter((c) => c !== code[0]))
                                }
                            }}
                            label={<Box color={isMatch ? 'forestgreen' : 'black'}>{code[0] + ': ' + code[1]}</Box>}
                        />
                    </Grid2>
                )
            })}
        </Grid2>
    )
}
