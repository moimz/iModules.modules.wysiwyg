/**
 * 이 파일은 아이모듈 위지윅에디터모듈의 일부입니다. (https://www.imodules.io)
 *
 * 위지윅에디터모듈 클래스를 정의한다.
 *
 * @file /modules/wysiwyg/scripts/Wysiwyg.ts
 * @author Arzz <arzz@arzz.com>
 * @license MIT License
 * @modified 2024. 10. 5.
 */
var modules;
(function (modules) {
    let wysiwyg;
    (function (wysiwyg) {
        class Wysiwyg extends Module {
            static editors = new WeakMap();
            /**
             * 모듈의 DOM 이벤트를 초기화한다.
             * 해당 DOM 내부에 에디터를 사용하는 <textarea> 필드가 존재할 경우
             * 에디터를 활성화한다.
             *
             * @param {Dom} $dom - 모듈 DOM 객체
             */
            init($dom) {
                if (Html.get('textarea[data-role=editor]', $dom).getEl() !== null) {
                    this.getEditor(Html.get('textarea[data-role=editor]', $dom));
                }
            }
            /**
             * <textarea> DOM 객체를 통해 에디터를 가져온다.
             *
             * @param {Dom} $textarea - <textarea> DOM 객체
             * @return {modules.wysiwyg.Editor} editor - 에디터 클래스
             */
            getEditor($textarea) {
                const textarea = $textarea.getEl();
                if (textarea instanceof HTMLTextAreaElement) {
                    if (modules.wysiwyg.Wysiwyg.editors.has(textarea) == false) {
                        modules.wysiwyg.Wysiwyg.editors.set(textarea, new modules.wysiwyg.Editor($textarea));
                    }
                    return modules.wysiwyg.Wysiwyg.editors.get(textarea);
                }
                return null;
            }
        }
        wysiwyg.Wysiwyg = Wysiwyg;
        class Editor {
            id;
            $textarea;
            editor;
            uploader;
            renderer;
            listeners;
            inputEvent = null;
            /**
             * <textarea> DOM 객체를 이용하여 에디터를 활성화한다.
             *
             * @param {Dom} $textarea - <textarea> DOM 객체
             * @param {modules.wysiwyg.Editor.Properties} properties - 설정 (DOM 객체에 설정된 값보다 우선시 됩니다.)
             */
            constructor($textarea, properties = null) {
                this.$textarea = $textarea;
                properties ??= {};
                this.id = this.$textarea.getAttr('data-id') ?? '';
                if (this.id.length == 0) {
                    this.id = properties.id ?? 'Wysiwyg-' + new Date().getTime();
                }
                this.listeners = properties.listeners ?? {};
                const imageUpload = properties.imageUpload ?? this.$textarea.getAttr('data-image-upload') === 'true';
                const fileUpload = properties.fileUpload ?? this.$textarea.getAttr('data-file-upload') === 'true';
                const videoUpload = properties.videoUpload ?? this.$textarea.getAttr('data-video-upload') === 'true';
                const height = properties.height ??
                    (this.$textarea.getAttr('data-height') ? parseInt(this.$textarea.getAttr('data-height'), 10) : 150);
                const maxHeight = properties.maxHeight ??
                    (this.$textarea.getAttr('data-max-height')
                        ? parseInt(this.$textarea.getAttr('data-max-height'), 10)
                        : null);
                let toolbars = properties.toolbars ?? [
                    'html',
                    '|',
                    'bold',
                    'underline',
                    'fontOptions',
                    'color',
                    '|',
                    'paragraphFormat',
                    'paragraphStyle',
                    'Hr',
                    'align',
                    'formatOL',
                    'formatUL',
                    'quote',
                    '|',
                    'insertLink',
                    'insertTable',
                    'insertImage',
                    'insertVideo',
                    'insertFile',
                    'emoticons',
                ];
                if (imageUpload == false && toolbars.indexOf('insertImage') >= 0) {
                    toolbars.splice(toolbars.indexOf('insertImage'), 1);
                }
                if (fileUpload == false && toolbars.indexOf('insertFile') >= 0) {
                    toolbars.splice(toolbars.indexOf('insertFile'), 1);
                }
                if (videoUpload == false && toolbars.indexOf('insertVideo') >= 0) {
                    toolbars.splice(toolbars.indexOf('insertVideo'), 1);
                }
                properties.scrollableContainer = 'div[data-module=wysiwyg][data-id="' + this.id + '"]';
                properties.tooltips = false;
                properties.toolbarSticky = false;
                properties.toolbarButtons =
                    properties.toolbarButtonsMD =
                        properties.toolbarButtonsSM =
                            properties.toolbarButtonsXS =
                                toolbars;
                properties.imageDefaultWidth = 0;
                properties.imageAddNewLine = true;
                properties.imageEditButtons = [
                    'imageReplace',
                    'imageRemove',
                    '|',
                    'imageDisplay',
                    'imageAlign',
                    'imageLink',
                    'linkOpen',
                    'linkEdit',
                    'linkRemove',
                    'imageAlt',
                    'imageSize',
                ];
                properties.tableEditButtons = [
                    'tableHeader',
                    'tableRemove',
                    '|',
                    'tableRows',
                    'tableColumns',
                    'tableCells',
                    '-',
                    'tableCellHorizontalAlign',
                    'tableCellVerticalAlign',
                    'tableCellBackground',
                    '|',
                    'tableStyle',
                    'tableCellStyle',
                ];
                properties.paragraphStyles = {
                    'fr-font-large': 'Large Font',
                    'fr-box-notice': 'Notice Box',
                };
                properties.videoUpload = videoUpload;
                properties.imageCORSProxy = '/module/wysiwyg/process/cors/';
                properties.codeBeautifierOptions = {
                    end_with_newline: true,
                    indent_inner_html: true,
                    extra_liners: [],
                    brace_style: 'expand',
                    indent_char: '\t',
                    indent_size: 1,
                    wrap_line_length: 0,
                };
                properties.htmlAllowedAttrs = [
                    'allowfullscreen',
                    'allowtransparency',
                    'alt',
                    'autoplay',
                    'checked',
                    'class',
                    'cols',
                    'colspan',
                    'content',
                    'contenteditable',
                    'controls',
                    'data',
                    'data-.*',
                    'datetime',
                    'disabled',
                    'download',
                    'form',
                    'href',
                    'id',
                    'name',
                    'playsinline',
                    'readonly',
                    'rowspan',
                    'src',
                    'style',
                    'tabindex',
                    'target',
                    'title',
                    'type',
                    'value',
                ];
                properties.pasteDeniedTags = [
                    'abbr',
                    'address',
                    'article',
                    'aside',
                    'audio',
                    'base',
                    'bdi',
                    'bdo',
                    'blockquote',
                    'button',
                    'canvas',
                    'caption',
                    'cite',
                    'code',
                    'col',
                    'colgroup',
                    'datalist',
                    'dd',
                    'del',
                    'details',
                    'dfn',
                    'dialog',
                    'dl',
                    'dt',
                    'em',
                    'embed',
                    'fieldset',
                    'figcaption',
                    'figure',
                    'footer',
                    'form',
                    'header',
                    'hgroup',
                    'iframe',
                    'input',
                    'ins',
                    'kbd',
                    'keygen',
                    'label',
                    'legend',
                    'link',
                    'main',
                    'mark',
                    'menu',
                    'menuitem',
                    'meter',
                    'nav',
                    'noscript',
                    'object',
                    'optgroup',
                    'option',
                    'output',
                    'param',
                    'pre',
                    'progress',
                    'queue',
                    'rp',
                    'rt',
                    'ruby',
                    's',
                    'samp',
                    'script',
                    'style',
                    'section',
                    'select',
                    'small',
                    'source',
                    'span',
                    'strike',
                    'strong',
                    'summary',
                    'textarea',
                    'time',
                    'title',
                    'tr',
                    'track',
                    'var',
                    'video',
                    'wbr',
                ];
                properties.pasteDeniedAttrs = ['class', 'id', 'style'];
                properties.linkEditButtons = ['linkOpen', 'linkEdit', 'linkRemove'];
                properties.linkInsertButtons = ['linkBack'];
                properties.linkList = [];
                this.editor = new modules.wysiwyg.FroalaEditor($textarea.getEl(), properties);
                this.uploader = properties.uploader ?? null;
                const attachment = Modules.get('attachment');
                if (this.uploader == null && $textarea.getAttr('data-uploader-id')) {
                    this.uploader = attachment.getUploader(Html.get('div[data-role=uploader][data-id="' + $textarea.getAttr('data-uploader-id') + '"]'));
                }
                this.renderer = this.editor.render((editor, $editor) => {
                    editor.events.on('keydown', (e) => {
                        if (e.key == 'Enter' && editor.$el.atwho('isSelecting')) {
                            return false;
                        }
                        if (e.key == 'Escape') {
                            e.stopPropagation();
                        }
                    }, true);
                    this.uploader?.setEditor(this);
                    this.uploader?.addEvent('update', (file) => {
                        const selector = '*[data-attachment-id][data-index="' + file.index + '"]';
                        const $placeholder = this.editor.$(selector, this.editor.get().$el);
                        if ($placeholder.length == 1) {
                            $placeholder.attr('data-attachment-id', file.attachment.id ?? 'UPLOADING');
                            if (file.status == 'COMPLETE') {
                                if ($placeholder.is('img') == true) {
                                    $placeholder.replaceWith(this.getImage(file));
                                }
                                else if ($placeholder.is('a') == true) {
                                    $placeholder.replaceWith(this.getFileLink(file));
                                }
                                else if ($placeholder.is('video') == true) {
                                    $placeholder.replaceWith(this.getVideoPlayer(file));
                                }
                            }
                            if (file.status == 'FAIL') {
                                $placeholder.remove();
                            }
                        }
                        const $uploading = this.editor.$('*[data-attachment-id].fr-uploading', this.editor.get().$el);
                        if ($uploading.length == 0) {
                            this.editor.get().edit.on();
                        }
                    });
                    $editor.on('froalaEditor.input', (e) => {
                        if (this.inputEvent === null) {
                            this.inputEvent = this.onEdit(e);
                        }
                    });
                    $editor.on('froalaEditor.focus', (e) => {
                        Html.el(e.currentTarget).trigger('editorFocus');
                    });
                    $editor.on('froalaEditor.blur', (e) => {
                        Html.el(e.currentTarget).trigger('editorBlur');
                    });
                    $editor.on('froalaEditor.image.beforePasteUpload', (_e, _editor, img) => {
                        img.remove();
                        return imageUpload;
                    });
                    $editor.on('froalaEditor.image.beforeUpload', (_e, editor, files) => {
                        if (imageUpload == false || files.length == 0 || this.uploader === null) {
                            editor.popups.hideAll();
                            return false;
                        }
                        editor.edit.off();
                        editor.events.focus(true);
                        editor.selection.restore();
                        const attachments = this.uploader.add(files, 'image');
                        for (const attachment of attachments) {
                            const placeholder = this.getImage(attachment);
                            editor.html.insert(placeholder);
                        }
                        editor.placeholder.refresh();
                        editor.popups.hideAll();
                        return false;
                    });
                    $editor.on('froalaEditor.file.beforeUpload', (_e, editor, files) => {
                        if (fileUpload == false || files.length == 0 || this.uploader === null) {
                            editor.popups.hideAll();
                            return false;
                        }
                        editor.edit.off();
                        editor.events.focus(true);
                        editor.selection.restore();
                        const attachments = this.uploader.add(files);
                        for (const attachment of attachments) {
                            const placeholder = this.getFileLink(attachment);
                            editor.html.insert(placeholder);
                        }
                        editor.placeholder.refresh();
                        editor.popups.hideAll();
                        return false;
                    });
                    $editor.on('froalaEditor.video.beforeUpload', (_e, editor, files) => {
                        if (fileUpload == false || files.length == 0 || this.uploader === null) {
                            return false;
                        }
                        editor.edit.off();
                        editor.events.focus(true);
                        editor.selection.restore();
                        const attachments = this.uploader.add(files);
                        for (const attachment of attachments) {
                            const placeholder = this.getVideoPlayer(attachment, true);
                            editor.html.insert(placeholder);
                        }
                        editor.placeholder.refresh();
                        editor.popups.hideAll();
                        return false;
                    });
                    editor.$el.css('minHeight', height + 'px');
                    if (maxHeight !== null) {
                        editor.$el.addClass('fr-scroll');
                        editor.$el.css('maxHeight', maxHeight + 'px');
                    }
                    if (typeof this.listeners.render == 'function') {
                        this.listeners.render(this);
                    }
                });
            }
            /**
             * 에디터 고유값을 가져온다.
             *
             * @return {string} id
             */
            getId() {
                return this.id;
            }
            /**
             * FroalaEditor 객체를 가져온다.
             *
             * @return {any} editor
             */
            getEditor() {
                return this.editor.get();
            }
            /**
             * FroalaEditor 의 DOM 객체를 가져온다.
             *
             * @return {any} $editor
             */
            $getEditor() {
                return this.editor.get().$el;
            }
            /**
             * 에디터에 포함된 업로더를 가져온다.
             *
             * @return {modules.attachment.Uploader} uploader
             */
            getUploader() {
                return this.uploader;
            }
            /**
             * 이미지 태그를 가져온다.
             *
             * @param {modules.attachment.Uploader.File} file
             * @return {string} html
             */
            getImage(file) {
                const attributes = {
                    src: file.attachment.view,
                    'data-attachment-id': file.attachment.id ?? 'UPLOADING',
                };
                if (file.status == 'COMPLETE') {
                    attributes.src = file.attachment.download;
                    attributes.download = file.attachment.name;
                    attributes['class'] = 'fr-fic fr-dib';
                }
                else {
                    attributes['data-index'] = file.index.toString();
                    attributes['class'] = 'fr-uploading fr-fic fr-dib';
                }
                const $img = Html.create('img', attributes);
                return $img.toHtml() + '<br>';
            }
            /**
             * 파일 다운로드 링크 HTML 을 가져온다.
             *
             * @param {modules.attachment.Uploader.File} file
             * @return {string} html
             */
            getFileLink(file) {
                const attributes = {
                    src: '',
                    'data-attachment-id': file.attachment.id ?? 'UPLOADING',
                    'data-module': 'attachment',
                    'contenteditable': 'false',
                    download: '',
                };
                if (file.status == 'COMPLETE') {
                    attributes.src = file.attachment.download;
                    attributes.download = file.attachment.name;
                    attributes['class'] = 'fr-deletable';
                }
                else {
                    attributes['data-index'] = file.index.toString();
                    attributes['class'] = 'fr-uploading fr-deletable';
                }
                const $link = Html.create('a', attributes);
                $link.append(Html.create('i', { 'data-type': file.attachment.type, 'data-extension': file.attachment.extension }, file.attachment.extension));
                $link.append(Html.create('span', null, file.attachment.name));
                $link.append(Html.create('small', null, Format.size(file.attachment.size)));
                return $link.toHtml() + '&nbsp;';
            }
            /**
             * 비디오 플레이어를 가져온다.
             *
             * @param {modules.attachment.Uploader.File} file
             * @param {boolean} is_wrapper
             * @return {string} html
             */
            getVideoPlayer(file, is_wrapper = false) {
                const attributes = {
                    'data-attachment-id': file.attachment.id ?? 'UPLOADING',
                    'controls': 'true',
                };
                if (file.status == 'COMPLETE') {
                    attributes.src = file.attachment.view;
                    attributes.download = file.attachment.name;
                    attributes['class'] = 'fr-deletable fr-draggable fr-fvc fr-dvi';
                }
                else {
                    attributes['data-index'] = file.index.toString();
                    attributes['class'] = 'fr-uploading fr-deletable fr-draggable fr-fvc fr-dvi';
                }
                const $video = Html.create('video', attributes);
                if (is_wrapper === true) {
                    const $wrapper = Html.create('span', {
                        class: 'fr-video fr-dvb fr-draggable',
                        contenteditable: 'false',
                        draggable: 'true',
                    });
                    $wrapper.append($video);
                    return $wrapper.toHtml() + '<br>';
                }
                return $video.toHtml() + '<br>';
            }
            /**
             * 파일을 삽입한다.
             *
             * @param {modules.attachment.Uploader.File} file
             */
            insertFile(file) {
                if (['image', 'svg', 'icon'].includes(file.attachment.type) == true) {
                    this.editor.get().image.insert(file.attachment.view, false, {
                        'attachment-id': file.attachment.id,
                    });
                }
                else {
                    this.editor.get().html.insert(this.getFileLink(file));
                }
            }
            /**
             * 에디터 콘텐츠 내용을 가져온다.
             *
             * @return {string} content
             */
            getContent() {
                if (this.editor.$get() === null) {
                    return this.$textarea.getValue();
                }
                if (this.editor.$get().froalaEditor('codeView.isActive') === true) {
                    this.editor.$get().froalaEditor('codeView.toggle');
                }
                return this.editor.$get().froalaEditor('html.get');
            }
            /**
             * 첨부파일을 가져온다.
             *
             * @return {string[]} attachment_ids - 첨부파일 고유값
             */
            getAttachments() {
                return this.uploader?.getValue() ?? [];
            }
            /**
             * 첨부파일을 제거한다.
             *
             * @param {modules.attachment.Uploader.File} file - 제거할 파일객체
             */
            removeAttachment(file) {
                const $file = this.editor.$('*[data-attachment-id="' + file.attachment.id + '"]', this.editor.get().$el);
                $file.remove();
            }
            /**
             * 에디터 콘텐츠 내용을 가져온다.
             *
             * @return {Object} data
             */
            getValue() {
                if (this.isEmpty() == true && this.getAttachments().length == 0) {
                    return null;
                }
                return {
                    content: this.getContent(),
                    attachments: this.getAttachments(),
                };
            }
            /**
             * 에디터 콘텐츠 내용을 설정한다.
             *
             * @param {Object} data
             */
            setValue(data = null) {
                this.renderer.then(($editor) => {
                    $editor.froalaEditor('html.set', data?.content ?? '');
                    this.uploader?.setValue(data?.attachments ?? []);
                });
            }
            /**
             * 에디터에 포커스를 지정한다.
             */
            focus() {
                this.renderer.then(($editor) => {
                    const editor = $editor.data('froala.editor');
                    editor.selection.setAtEnd(editor.$el.get(0));
                    editor.selection.restore();
                });
            }
            /**
             * 활성화여부를 지정한다.
             *
             * @param {boolean} disabled - 비활성화여부
             */
            setDisabled(disabled) {
                this.renderer.then(($editor) => {
                    if (disabled == true) {
                        $editor.froalaEditor('edit.off');
                    }
                });
            }
            /**
             * 에디터 최소높이를 지정한다.
             *
             * @param {number} height - 에디터최소높이
             * @param {boolean} includedToolbar - 툴바높이를 포함하여 계산할지 여부
             */
            setHeight(height, includedToolbar) {
                this.renderer.then(($editor) => {
                    const editor = $editor.data('froala.editor');
                    if (includedToolbar == true) {
                        height = height - editor.$tb.outerHeight();
                    }
                    editor.$el.css('minHeight', height + 'px');
                });
            }
            /**
             * 에디터 최소높이를 지정한다.
             *
             * @param {number} maxHeight - 에디터최소높이
             * @param {boolean} includedToolbar - 툴바높이를 포함하여 계산할지 여부
             */
            setMaxHeight(maxHeight, includedToolbar) {
                this.renderer.then(($editor) => {
                    const editor = $editor.data('froala.editor');
                    if (maxHeight === null) {
                        editor.$el.css('maxHeight', '');
                        editor.$el.removeClass('fr-scroll');
                    }
                    else {
                        if (includedToolbar == true) {
                            maxHeight = maxHeight - editor.$tb.outerHeight();
                        }
                        editor.$el.css('maxHeight', maxHeight + 'px');
                        editor.$el.addClass('fr-scroll');
                    }
                });
            }
            /**
             * 본문이 비었는지 확인한다. P, BR 태그 및 공백등을 제거하여 실제 데이터가 존재하는지 확인한다.
             *
             * @return {boolean} is_empty
             */
            isEmpty() {
                return (this.getContent()
                    .replace(/<\/?(p|br|span)[^>]*>/gi, '')
                    .trim().length == 0);
            }
            /**
             * 부하를 줄이기 위해 5초 간격으로 변경 이벤트를 트리거한다.
             *
             * @param {InputEvent} e
             */
            async onEdit(e) {
                await iModules.sleep(5000);
                if (e.currentTarget) {
                    Html.el(e.currentTarget).trigger('edit');
                }
                this.inputEvent = null;
            }
        }
        wysiwyg.Editor = Editor;
    })(wysiwyg = modules.wysiwyg || (modules.wysiwyg = {}));
})(modules || (modules = {}));
