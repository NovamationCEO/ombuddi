import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { CodeSetterBox } from './CodeSetterBox'
import React from 'react'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, OmbudsType } from '../types/majorTypes'
import { useUserId } from '../tools/useUserId'
import { useParams } from 'react-router-dom'
import { updater } from '../tools/db_tools/updater'
import { ioaCodeIdSet } from '../constants/ioaConstants'

export function EditCodeDialog(props: { open: boolean; onClose: () => void }) {
    const { open, onClose } = props
    const [activeIoaCodes, setActiveIoaCodes] = React.useState<string[]>([])
    const [activeOrgCodes, setActiveOrgCodes] = React.useState<string[]>([])
    const { caseId } = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const userId = useUserId()
    const ombudsRes = useGetter<OmbudsType>(['get_ombuds_by_id', userId])
    const organizationId = ombudsRes.data?.organizationId

    React.useEffect(() => {
        if (!caseRes.data) return
        const existing = caseRes.data.codes ?? []
        setActiveIoaCodes(existing.filter((code) => ioaCodeIdSet.has(code)))
        setActiveOrgCodes(existing.filter((code) => !ioaCodeIdSet.has(code)))
    }, [caseRes.data])

    async function save() {
        const newCodes = [...new Set(activeIoaCodes.concat(activeOrgCodes))]

        const payload = {
            id: caseId,
            codes: newCodes,
        }
        await updater('update_case', payload)
        caseRes.refetch()
        onClose()
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
        >
            <DialogTitle>Edit Codes</DialogTitle>
            <DialogContent>
                <Stack
                    spacing={2}
                    direction={'row'}
                    sx={{
                        display: 'flex',
                    }}
                >
                    <CodeSetterBox
                        activeCodeIds={activeIoaCodes}
                        setActiveCodeIds={setActiveIoaCodes}
                        source={{ kind: 'ioa' }}
                    />
                    <CodeSetterBox
                        activeCodeIds={activeOrgCodes}
                        setActiveCodeIds={setActiveOrgCodes}
                        source={{ kind: 'org', organizationId }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    variant={'outlined'}
                >
                    Cancel
                </Button>
                <Button
                    onClick={save}
                    variant={'contained'}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}
