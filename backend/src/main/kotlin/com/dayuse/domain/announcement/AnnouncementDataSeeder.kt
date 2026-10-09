package com.dayuse.domain.announcement

import com.dayuse.domain.announcement.dto.AnnouncementUpsertRequest
import com.dayuse.domain.announcement.service.AnnouncementService
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import java.time.LocalDateTime

/**
 * 기동 시 dayuse 서비스에 알맞은 기본 안내 공지들을 멱등하게 시드합니다.
 *
 * 이미 등록된 소식이 존재하는 경우 중복 생성하지 않습니다.
 */
@Component
@ConditionalOnProperty(
    name = ["announcement.seed.enabled"],
    havingValue = "true",
    matchIfMissing = true
)
class AnnouncementDataSeeder(
    private val announcementRepository: AnnouncementRepository,
    private val announcementService: AnnouncementService
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments?) {
        seed()
    }

    fun seed() {
        val baseNow = LocalDateTime.now()

        for (seed in DEFAULT_ANNOUNCEMENTS) {
            val title = seed.upsertRequest.title
            if (announcementRepository.existsByTitle(title)) {
                log.debug("소식이 이미 존재하여 건너뜁니다: title={}", title)
                continue
            }

            try {
                val created = announcementService.createDraft(
                    actorId = 1L,
                    request = seed.upsertRequest,
                    now = baseNow.minusDays(seed.daysAgo)
                )

                if (seed.autoPublish) {
                    announcementService.publishAnnouncement(
                        actorId = 1L,
                        announcementId = created.id,
                        request = com.dayuse.domain.announcement.dto.AnnouncementPublishRequest(
                            publishAt = baseNow.minusDays(seed.daysAgo),
                            noticeEndsAt = baseNow.plusDays(seed.durationDays - seed.daysAgo)
                        ),
                        now = baseNow.minusDays(seed.daysAgo)
                    )
                }
                log.info("기본 소식 시드 생성 완료: id={}, title={}", created.id, title)
            } catch (ex: Exception) {
                log.warn("기본 소식 시드 생성 중 오류 발생: title={}", title, ex)
            }
        }
    }

    data class AnnouncementSeedItem(
        val upsertRequest: AnnouncementUpsertRequest,
        val autoPublish: Boolean = true,
        val daysAgo: Long = 0,
        val durationDays: Long = 14
    )

    companion object {
        val DEFAULT_ANNOUNCEMENTS: List<AnnouncementSeedItem> = listOf(
            // 1. 데이유즈의 시작: 목표는 각자, 꾸준함은 함께! (새소식 목록 상시 열람)
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "반가워요! 작심삼일을 끝내는 소모임 습관 챌린지, 데이유즈입니다 🖐️",
                    summary = "친구들과 함께 각자의 목표를 인증하고 응원하는 데이유즈의 여정이 시작되었습니다.",
                    body = """
## 혼자 결심하면 작심삼일, 하지만 함께라면?
습관 형성이 늘 어려웠던 이유는 혼자만의 다짐에 머물렀기 때문입니다.
데이유즈(dayuse)는 친구, 동료들과 함께 소모임을 만들어 각자의 작은 목표를 매일 인증하고 서로의 성취를 응원하는 공간입니다.

- **소액 보증금과 성취 정산**: 미인증 시 벌금 규칙으로 느슨해진 마음을 팽팽하게 잡아줘요.
- **다정한 마스코트 '데이유(Dayu)'**: 손을 번쩍 들고 오늘의 실천을 자랑하는 데이유가 여러분의 여정을 함께합니다.
- **목표는 각자, 꾸준함은 함께**: 지금 바로 새로운 모임을 만들고 친구들을 초대해 보세요!
                    """.trimIndent(),
                    imageUrl = null,
                    imageAlt = null,
                    ctaLabel = "새 모임 만들기",
                    ctaTarget = AnnouncementActionTarget.GROUP_CREATE,
                    placement = null,
                    homeVisible = false
                ),
                autoPublish = true,
                daysAgo = 14,
                durationDays = 60
            ),

            // 2. 심야 유예 시간 안내 (인증 작성 화면 인라인 노출)
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "자정을 넘겨도 괜찮아요! 익일 오전 9시까지 밤샘 인증 유예 🌙",
                    summary = "늦은 밤 공부나 야근으로 자정을 넘겼더라도 익일 오전 9시까지 당일 인증으로 인정해 드려요.",
                    body = """
## 늦은 밤 열정을 쏟는 당신을 위해
자정(00:00)을 갓 넘겨 아쉽게 스트릭을 놓치거나 벌금을 물게 될까 걱정하셨나요?
데이유즈는 **익일 오전 9:00까지**를 유예 구간으로 두어, 벌금 없이 정상 당일 인증으로 인정합니다.

- **안심 인증 시간**: 대상일 익일 오전 09:00까지 여유롭게 기록하세요.
- **서버 KST 기준 동기화**: 시간대 오류 없이 공정하게 정산됩니다.
                    """.trimIndent(),
                    imageUrl = null,
                    imageAlt = null,
                    ctaLabel = null,
                    ctaTarget = null,
                    placement = AnnouncementPlacement.CERT_CREATE,
                    homeVisible = false
                ),
                autoPublish = true,
                daysAgo = 10,
                durationDays = 30
            ),

            // 3. 인증 화면 클립보드 이미지 바로 붙여넣기 지원 (인증 작성 화면 인라인)
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "인증 화면 이미지 바로 붙여넣기 지원",
                    summary = "촬영하거나 캡처한 이미지를 복사(Ctrl+V / Cmd+V)하여 바로 인증할 수 있어요.",
                    body = """
## 이제 더 빠르게 인증하세요!
인증 사진을 찍거나 캡처한 뒤, 파일 선택 없이 **바로 붙여넣기(Cmd+V / Ctrl+V)**로 간편하게 첨부할 수 있습니다.

- PC 및 태블릿 웹 브라우저 완벽 지원
- 클립보드에 복사된 이미지 자동 감지 및 미리보기
- 최대 5MB까지 자동 최적화 업로드
                    """.trimIndent(),
                    imageUrl = null,
                    imageAlt = null,
                    ctaLabel = null,
                    ctaTarget = null,
                    placement = AnnouncementPlacement.CERT_CREATE,
                    homeVisible = false,
                    featureKey = "clipboard_image_paste"
                ),
                autoPublish = true,
                daysAgo = 2,
                durationDays = 14
            ),

            // 4. 협동형 '함께하기' 챌린지 출시 (모임 홈 상단 노출)
            // 특정 모임/챌린지로의 이동 동선이 모호하므로 CTA는 생략하고 가이드에 집중
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "팀원 중 누구든 한 명만 해도 성공! 협동형 '함께하기' 챌린지 🤝",
                    summary = "반려견 산책, 공동 업무 체크처럼 팀원들이 이어달리며 함께 완성하는 챌린지가 열렸어요.",
                    body = """
## 우리 중 누구든 한 명만 성공해도 팀 전체 성공!
혼자 매일 하기 부담스러운 일이나 한 가족의 반려견 산책처럼 함께 나눠서 해야 하는 목표가 있으신가요?
협동형 **함께하기(TOGETHER)** 챌린지로 팀원들과 힘을 모아보세요.

- **누구든 한 번만 인증하면 당일 팀 미션 올클리어!**
- 모임 멤버들이 돌아가며 실천할 수 있어 부담은 줄고 성취감은 배가됩니다.
- 챌린지를 생성할 때 '함께하기' 방식을 선택할 수 있어요.
                    """.trimIndent(),
                    imageUrl = null,
                    imageAlt = null,
                    ctaLabel = null,
                    ctaTarget = null,
                    placement = AnnouncementPlacement.GROUP_DETAIL,
                    homeVisible = false
                ),
                autoPublish = true,
                daysAgo = 5,
                durationDays = 21
            ),

            // 5. 인증 완료 축하 안내 (인증 완료 축하 모달 노출)
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "오늘의 멋진 성취, 인스타 스토리 공유 카드로 자랑해보세요! 📸",
                    summary = "오늘 인증을 완료하셨나요? 감성적인 공유 카드로 오늘의 땀방울을 친구들과 나눠보세요.",
                    body = """
## 오늘 하루도 해낸 나를 칭찬해요!
인증 완료 직후 [인증 카드 공유하기] 버튼을 누르면 인스타그램 스토리 규격의 멋진 카드가 완성됩니다.

- 개인정보는 안전하게 가려지고 내 연속 달성(Streak)과 사진만 감성적으로 강조!
- 친구들에게 나의 꾸준함을 자랑하고 자극을 선물하세요.
                    """.trimIndent(),
                    imageUrl = null,
                    imageAlt = null,
                    ctaLabel = null,
                    ctaTarget = null,
                    placement = AnnouncementPlacement.CERT_SUCCESS,
                    homeVisible = false
                ),
                autoPublish = true,
                daysAgo = 3,
                durationDays = 21
            ),

            // 6. 리데이(Reday) 티켓 & 지각 벌금 면제 시스템 (홈 화면 노출)
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "아쉽게 놓친 스트릭, '리데이'로 지켜보세요 🎟️",
                    summary = "어제 하루 깜빡했더라도 걱정 마세요! 리데이 티켓으로 소중한 연속 기록을 이어갈 수 있습니다.",
                    body = """
## 연속 인증의 든든한 지원군, 리데이(Reday)
열심히 이어오던 습관 기록이 하루의 바쁜 일정 때문에 끊겨 아쉬우셨나요?
지각 인증 구간에 인증을 등록했더라도, 보유한 **리데이 티켓**이나 **자체 보상형 광고 시청**을 통해 지각 벌금을 면제받을 수 있습니다.

- 지각 사실은 유지되지만 벌금은 0원으로 깔끔하게 면제!
- 모임원들과 함께 달성률을 유지하고 페널티 정산을 방어하세요.
- 광고 10초 시청으로 누구나 간편하게 티켓을 충전할 수 있습니다.
                    """.trimIndent(),
                    imageUrl = null,
                    imageAlt = null,
                    ctaLabel = "리데이 내역 확인하기",
                    ctaTarget = AnnouncementActionTarget.REDAY_HISTORY,
                    placement = null,
                    homeVisible = true,
                    featureKey = "reday"
                ),
                autoPublish = true,
                daysAgo = 4,
                durationDays = 21
            ),

            // 7. 웹 푸시 알림 설정 안내 (상시 열람 가능한 소식)
            AnnouncementSeedItem(
                upsertRequest = AnnouncementUpsertRequest(
                    title = "오늘의 인증 리마인더, 웹 푸시 알림 켜기 🔔",
                    summary = "인증 마감 시간을 놓치지 않도록 원하는 시간에 데이유가 다정하게 알려드릴게요.",
                    body = """
## 잊지 않고 인증하는 가장 확실한 방법
매일 저녁 '아 맞다 인증!' 하고 놀란 적 있으신가요?
브라우저 웹 푸시 알림을 켜두시면 내가 정한 인증 시간에 맞춰 푸시 알림을 보내드립니다.

- **원하는 알림 시간 설정**: 퇴근길, 취침 전 등 내 생활 패턴에 맞게 설정 가능
- **친구들의 인증 소식**: 모임원들이 오늘 인증을 올렸을 때 실시간 자극 피드 제공
- 마이페이지 알림 설정 메뉴에서 언제든지 켜고 끌 수 있습니다.
                    """.trimIndent(),
                    imageUrl = null,
                    imageAlt = null,
                    ctaLabel = "알림 설정하러 가기",
                    ctaTarget = AnnouncementActionTarget.MY_PAGE,
                    placement = null,
                    homeVisible = false
                ),
                autoPublish = true,
                daysAgo = 8,
                durationDays = 30
            )
        )
    }
}
