import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Button } from '../ui'
import ParticipantSelector from './ParticipantSelector'

const EditMeetingDialog = ({
    open,
    onOpenChange,
    onMeetingUpdated,
    meeting,
    currentUserId
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        location: ''
    })
    const [selectedParticipants, setSelectedParticipants] = useState([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    // meeting 데이터가 변경될 때마다 폼 초기화
    useEffect(() => {
        if (meeting && open) {
            // datetime-local 형식으로 변환
            const formatDateTime = (dateTimeString) => {
                const date = new Date(dateTimeString)
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                const hours = String(date.getHours()).padStart(2, '0')
                const minutes = String(date.getMinutes()).padStart(2, '0')
                return `${year}-${month}-${day}T${hours}:${minutes}`
            }

            setFormData({
                title: meeting.title || '',
                description: meeting.description || '',
                start_time: formatDateTime(meeting.start_time),
                end_time: formatDateTime(meeting.end_time),
                location: meeting.location || ''
            })

            // 현재 참가자 중 호스트가 아닌 사람들만 선택
            const participants = meeting.meeting_participants
                ?.filter(p => p.role !== 'host')
                .map(p => p.user_id) || []
            setSelectedParticipants(participants)
        }
    }, [meeting, open])

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.title.trim()) {
            newErrors.title = '회의 제목을 입력해주세요'
        }

        if (!formData.start_time) {
            newErrors.start_time = '시작 시간을 선택해주세요'
        }

        if (!formData.end_time) {
            newErrors.end_time = '종료 시간을 선택해주세요'
        }

        if (formData.start_time && formData.end_time) {
            const startTime = new Date(formData.start_time)
            const endTime = new Date(formData.end_time)

            if (endTime <= startTime) {
                newErrors.end_time = '종료 시간은 시작 시간보다 늦어야 합니다'
            }

            // 수정 시에는 과거 시간도 허용 (이미 지난 회의를 수정할 수 있음)
            // 단, 시작 시간이 현재보다 이전이면 경고만 표시
            const now = new Date()
            if (startTime < now && meeting && new Date(meeting.start_time) >= now) {
                // 원래는 미래였는데 과거로 변경하려는 경우만 막기
                newErrors.start_time = '시작 시간을 과거로 변경할 수 없습니다'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleUpdateMeeting = async () => {
        if (!validateForm()) return

        setLoading(true)

        try {
            // 회의 정보 업데이트
            const { data: meetingData, error: meetingError } = await supabase
                .from('meetings')
                .update({
                    title: formData.title,
                    description: formData.description,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    location: formData.location
                })
                .eq('id', meeting.id)
                .select()
                .single()

            if (meetingError) {
                console.error('Error updating meeting:', meetingError)
                alert('회의 수정 중 오류가 발생했습니다.')
                return
            }

            // 기존 참가자 목록 가져오기
            const { data: existingParticipants, error: fetchError } = await supabase
                .from('meeting_participants')
                .select('user_id, role')
                .eq('meeting_id', meeting.id)

            if (fetchError) {
                console.error('Error fetching existing participants:', fetchError)
                alert('참가자 정보를 가져오는 중 오류가 발생했습니다.')
                return
            }

            // 호스트는 제외하고 일반 참가자만 처리
            const existingParticipantIds = existingParticipants
                .filter(p => p.role !== 'host')
                .map(p => p.user_id)

            // 삭제할 참가자 (기존에 있었지만 선택 해제된 사람)
            const participantsToRemove = existingParticipantIds.filter(
                id => !selectedParticipants.includes(id)
            )

            // 추가할 참가자 (새로 선택된 사람)
            // Filter out currentUserId to prevent adding host as participant
            const participantsToAdd = selectedParticipants
                .filter(id => !existingParticipantIds.includes(id))
                .filter(id => id !== currentUserId && id !== meeting.created_by) // Prevent duplicate host

            // 참가자 삭제
            if (participantsToRemove.length > 0) {
                const { error: removeError } = await supabase
                    .from('meeting_participants')
                    .delete()
                    .eq('meeting_id', meeting.id)
                    .in('user_id', participantsToRemove)

                if (removeError) {
                    console.error('Error removing participants:', removeError)
                }
            }

            // 참가자 추가
            if (participantsToAdd.length > 0) {
                const newParticipants = participantsToAdd.map(userId => ({
                    meeting_id: meeting.id,
                    user_id: userId,
                    role: 'participant'
                }))

                const { error: addError } = await supabase
                    .from('meeting_participants')
                    .insert(newParticipants)

                if (addError) {
                    console.error('Error adding participants:', addError)
                }
            }

            // 폼 초기화
            setFormData({
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                location: ''
            })
            setSelectedParticipants([])
            setErrors({})

            onMeetingUpdated()
            onOpenChange(false)
        } catch (error) {
            console.error('Error:', error)
            alert('회의 수정 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setFormData({
            title: '',
            description: '',
            start_time: '',
            end_time: '',
            location: ''
        })
        setSelectedParticipants([])
        setErrors({})
        onOpenChange(false)
    }

    if (!meeting) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">회의 수정</DialogTitle>
                    <DialogDescription>
                        회의 정보를 수정합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <Input
                            label="회의 제목 *"
                            placeholder="회의 제목을 입력하세요"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            error={errors.title}
                        />

                        <Input
                            label="회의 설명"
                            placeholder="회의에 대한 간단한 설명을 입력하세요"
                            multiline
                            rows={3}
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            error={errors.description}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="시작 시간 *"
                            type="datetime-local"
                            value={formData.start_time}
                            onChange={(e) => handleInputChange('start_time', e.target.value)}
                            error={errors.start_time}
                        />
                        <Input
                            label="종료 시간 *"
                            type="datetime-local"
                            value={formData.end_time}
                            onChange={(e) => handleInputChange('end_time', e.target.value)}
                            error={errors.end_time}
                        />
                    </div>

                    <Input
                        label="장소 (선택사항)"
                        placeholder="회의 장소나 온라인 링크를 입력하세요"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        error={errors.location}
                    />

                    <div className="border-t pt-4">
                        <ParticipantSelector
                            workspaceId={meeting.workspace_id}
                            currentUserId={currentUserId}
                            selectedParticipants={selectedParticipants}
                            onParticipantsChange={setSelectedParticipants}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleUpdateMeeting}
                        disabled={loading}
                        className="min-w-[100px]"
                    >
                        {loading ? '수정 중...' : '수정 완료'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default EditMeetingDialog