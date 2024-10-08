<?php
/**
 * 이 파일은 아이모듈 위지윅에디터모듈의 일부입니다. (https://www.imodules.io)
 *
 * 에디터에 의해 편집된 콘텐츠 구조체를 정의한다.
 *
 * @file /modules/wysiwyg/dtos/EditorContent.php
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2024. 9. 14.
 */
namespace modules\wysiwyg\dtos;
class EditorContent
{
    /**
     * @var ?object $_origin 원본 콘텐츠
     */
    private ?object $_origin = null;

    /**
     * @var string $_id 콘텐츠 고유값
     */
    private string $_id;

    /**
     * @var string $_content 본문내용
     */
    private string $_content;

    /**
     * @var \Component $_component 콘텐츠를 생성한 컴포넌트 객체
     */
    private \Component $_component;

    /**
     * @var ?string $_position_type 콘텐츠가 작성된 위치종류
     */
    private ?string $_position_type;

    /**
     * @var string|int|null $_content 콘텐츠가 작성된 위치고유값
     */
    private string|int|null $_position_id;

    /**
     * @var string[] $_attachments 첨부된 첨부파일 고유값
     */
    private array $_attachments;

    /**
     * @var string[] $_inserts 첨부된 파일중 본문에 삽입된 첨부파일 고유값
     */
    private array $_inserts;

    /**
     * 에디터 콘텐츠 구조체를 정의한다.
     *
     * @param object $origin 원본콘텐츠정보
     * @param \Component $component 콘텐츠를 생성한 컴포넌트객체
     * @param ?string $position_type 콘텐츠위치종류
     * @param string|int|null $position_id 콘텐츠위치고유값
     */
    public function __construct(
        ?object $origin,
        \Component $component,
        ?string $position_type,
        string|int|null $position_id
    ) {
        $this->_origin = $origin;
        $this->_id = $origin->content_id ?? ($origin->id ?? \UUID::V4());
        $this->_component = $component;
        $this->_position_type = $position_type;
        $this->_position_id = $position_id;
    }

    /**
     * 본문에 첨부된 첨부파일 고유값을 가져온다.
     * 해당 첨부파일이 이미 다른 위치에서 출판된 경우 새로운 첨부파일 고유값을 생성한다.
     *
     * @param string $attachment_id
     * @return ?string $attachment_id
     */
    private function getAttachmentId(string $attachment_id): ?string
    {
        /**
         * @var \modules\attachment\Attachment $mAttachment
         */
        $mAttachment = \Modules::get('attachment');
        $attachment = $mAttachment->getAttachment($attachment_id);
        if ($attachment === null) {
            return null;
        }

        if ($attachment->isPublished() == true) {
            /**
             * 콘텐츠의 첨부파일이 이미 출판되어 있고, 출판된 위치가 콘텐츠 위치와 다를 경우
             * 첨부파일을 복제한다.
             */
            if (
                $attachment->getComponent()->getType() != $this->_component->getType() ||
                $attachment->getComponent()->getName() != $this->_component->getName() ||
                $attachment->getPositionType() != $this->_position_type ||
                $attachment->getPositionId() != $this->_position_id
            ) {
                $attachment_id = $mAttachment->createDraftByAttachment($attachment->getId());
            }
        }

        return $attachment_id;
    }

    /**
     * 본문 콘텐츠를 처리한다.
     */
    private function parse(): void
    {
        $exists = [];
        $attachments = [];
        $inserts = [];

        $content = $this->_origin?->content ?? '';

        if (
            preg_match_all('/<img[^>]*data-attachment-id="(.*?)"[^>]*>/i', $content, $matches, PREG_SET_ORDER) == true
        ) {
            foreach ($matches as $matched) {
                $origin = $matched[0];

                $exists[] = $matched[1];
                $attachment_id = $this->getAttachmentId($matched[1]);
                if ($attachment_id === null) {
                    $content = str_replace($origin, '', $content);
                    continue;
                }

                $attachments[] = $attachment_id;
                $inserts[] = $attachment_id;

                if (preg_match('/class="(.*?)"/i', $origin, $class) == true) {
                    $class = $class[1];
                } else {
                    $class = null;
                }

                if (preg_match('/style="(.*?)"/i', $origin, $style) == true) {
                    $style = $style[1];
                } else {
                    $style = null;
                }

                $insert = \Html::element('img', [
                    'data-attachment-id' => $attachment_id,
                    'class' => $class,
                    'style' => $style,
                ]);

                $content = str_replace($origin, $insert, $content);
            }
        }

        if (
            preg_match_all(
                '/<video[^>]*data-attachment-id="(.*?)"[^>]*>.*?<\/video>/i',
                $content,
                $matches,
                PREG_SET_ORDER
            ) == true
        ) {
            foreach ($matches as $matched) {
                $origin = $matched[0];

                $exists[] = $matched[1];
                $attachment_id = $this->getAttachmentId($matched[1]);
                if ($attachment_id === null) {
                    $content = str_replace($origin, '', $content);
                    continue;
                }

                $attachments[] = $attachment_id;
                $inserts[] = $attachment_id;

                if (preg_match('/class="(.*?)"/i', $origin, $class) == true) {
                    $class = $class[1];
                } else {
                    $class = null;
                }

                if (preg_match('/style="(.*?)"/i', $origin, $style) == true) {
                    $style = $style[1];
                } else {
                    $style = null;
                }

                $insert = \Html::element(
                    'video',
                    [
                        'data-attachment-id' => $attachment_id,
                        'class' => $class,
                        'style' => $style,
                    ],
                    ''
                );

                $content = str_replace($origin, $insert, $content);
            }
        }

        if (
            preg_match_all('/<a[^>]*data-attachment-id="(.*?)"[^>]*>.*?<\/a>/i', $content, $matches, PREG_SET_ORDER) ==
            true
        ) {
            foreach ($matches as $matched) {
                $origin = $matched[0];

                $exists[] = $matched[1];
                $attachment_id = $this->getAttachmentId($matched[1]);
                if ($attachment_id === null) {
                    $content = str_replace($origin, '', $content);
                    continue;
                }

                $attachments[] = $attachment_id;
                $inserts[] = $attachment_id;
                $insert = '<a data-attachment-id="' . $attachment_id . '"></a>';
                $content = str_replace($origin, $insert, $content);
            }
        }

        foreach ($this->_origin->attachments ?? [] as $attachment) {
            if (in_array($attachment, $exists) == false) {
                $attachments[] = $attachment;
            }
        }

        $this->_content = $content;
        $this->_attachments = $attachments;
        $this->_inserts = $inserts;
    }

    /**
     * 데이터베이스에 저장하기 위해 가공한 콘텐츠를 가져온다.
     *
     * @return string $content
     */
    public function getContent(): string
    {
        if (isset($this->_content) == false) {
            $this->parse();
        }

        return $this->_content;
    }

    /**
     * 본문 또는 업로더에 첨부된 첨부파일 고유값 배열을 가져온다.
     *
     * @param bool $insert_only 내용에 포함된 첨부파일만 가져올지 여부
     * @return string[] $attachments
     */
    public function getAttachments(bool $insert_only = false): array
    {
        if (isset($this->_attachments) == false || isset($this->_inserts) == false) {
            $this->parse();
        }

        if ($insert_only == true) {
            return $this->_inserts;
        } else {
            return $this->_attachments;
        }
    }

    /**
     * 에디터 내용이 비었는지 확인한다.
     *
     * @param bool $insert_only 내용에 포함된 첨부파일만 확인할지 여부
     * @return bool $isEmpty
     */
    public function isEmpty(bool $insert_only = false): bool
    {
        if (strlen(trim(strip_tags($this->getContent()))) == 0 && count($this->getAttachments($insert_only)) == 0) {
            return true;
        }

        return false;
    }

    /**
     * 데이터베이스에 저장하기 위해 가공한 콘텐츠와 첨부파일목록을 JSON 으로 가져온다.
     *
     * @param bool $insert_only 내용에 포함된 첨부파일만 가져올지 여부
     * @param bool $remove_attachments 내용에 포함된 첨부파일만 가져올때 내용에 포함되지 않는 파일을 제거할지 여부
     * @return object $json
     */
    public function getJson(bool $insert_only = false, bool $remove_attachments = false): object
    {
        $json = new \stdClass();
        $json->content = $this->getContent();
        $json->attachments = $this->getAttachments($insert_only);

        if ($insert_only == true && $remove_attachments == true) {
            /**
             * @var \modules\attachment\Attachment $mAttachment
             */
            $mAttachment = \Modules::get('attachment');
            foreach ($this->getAttachments() as $attachment_id) {
                if (in_array($attachment_id, $json->attachments) == false) {
                    $mAttachment->deleteFile($attachment_id);
                }
            }
        }

        return $json;
    }
}
