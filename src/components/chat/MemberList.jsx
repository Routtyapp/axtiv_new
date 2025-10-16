import { Avatar, Badge, ScrollArea, AvatarFallback } from '../ui'

const MemberList = ({ members, currentUserId }) => {
    // 사용자 표시 이름 추출 함수
    const getDisplayName = (member, isCurrentUser) => {
        if (isCurrentUser) return '나'

        // user_id가 이메일 형식이면 @ 앞부분만 추출
        if (member.user_id && member.user_id.includes('@')) {
            return member.user_id.split('@')[0]
        }

        return member.user_id || '알 수 없음'
    }

    return (
        <div>
            {members.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">멤버가 없습니다.</p>
            ) : (
                <ScrollArea className="h-80">
                    <div className="space-y-2 pr-4">
                        {members.map((member) => {
                            const isCurrentUser = member.user_id === currentUserId
                            const displayName = getDisplayName(member, isCurrentUser)

                            return (
                                <div
                                    key={member.id}
                                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                                        isCurrentUser
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                                    }`}
                                >
                                    {/* 아바타 */}
                                    <Avatar>
                                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white font-semibold">
                                            {displayName?.charAt(0)?.toUpperCase() || '?'}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* 사용자 정보 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {displayName}
                                            </p>
                                            {member.role === 'admin' && (
                                                <Badge variant="secondary" className="text-xs">
                                                    관리자
                                                </Badge>
                                            )}
                                        </div>
                                        {member.email && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {member.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            )}
        </div>
    )
}

export default MemberList