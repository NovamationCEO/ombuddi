import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material'
import { CodeSetterBox } from './CodeSetterBox'
import React from 'react'
import { useIoaOrgId } from '../tools/useIoaOrgId'
import { useGetter } from '../tools/db_tools/useGetter'
import { CaseType, CodeType, OmbudsType } from '../types/majorTypes'
import { useUserId } from '../tools/useUserId'
import { useParams } from 'react-router-dom'
import { updater } from '../tools/db_tools/updater'

export function EditCodeDialog(props: { open: boolean; onClose: () => void }) {
    const { open, onClose } = props
    const [activeIoaCodes, setActiveIoaCodes] = React.useState<string[]>([])
    const [activeOrgCodes, setActiveOrgCodes] = React.useState<string[]>([])
    const { caseId } = useParams()
    const caseRes = useGetter<CaseType>(['get_case_by_id', caseId])
    const userId = useUserId()
    const ombudsRes = useGetter<OmbudsType>(['get_ombuds_by_id', userId])
    const organizationId = ombudsRes.data?.organizationId
    const ioaId = useIoaOrgId()
    const masterIoaCodesRes = useGetter<CodeType[]>(['get_codes_by_organization_id', ioaId])
    const masterIoaCodes = masterIoaCodesRes.data?.map((code) => code.id) || []

    React.useEffect(() => {
        if (!caseRes.data) return
        const newIoaCodes = caseRes.data?.codes.filter((code) => masterIoaCodes.includes(code))
        const newOrgCodes = caseRes.data?.codes.filter((code) => !masterIoaCodes.includes(code))
        setActiveIoaCodes(newIoaCodes || [])
        setActiveOrgCodes(newOrgCodes || [])
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
                        display: 'flex'
                    }}
                >
                    <CodeSetterBox
                        activeCodeIds={activeIoaCodes}
                        setActiveCodeIds={setActiveIoaCodes}
                        organizationId={ioaId}
                    />
                    <CodeSetterBox
                        activeCodeIds={activeOrgCodes}
                        setActiveCodeIds={setActiveOrgCodes}
                        organizationId={organizationId ?? ''}
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
    );
}
