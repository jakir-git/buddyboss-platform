<?php
/**
 * The template for displaying activity header
 *
 * This template can be overridden by copying it to yourtheme/buddypress/common/js-templates/activity/parts/bp-editor-toolbar.php.
 *
 * @since [BBVERSION]
 * @version [BBVERSION]
 */

?>
<script type="text/html" id="tmpl-editor-toolbar">
		<div class="post-elements-buttons-item show-toolbar" data-bp-tooltip-pos="up" data-bp-tooltip="<?php esc_attr_e( 'Show formatting', 'buddyboss' ); ?>" data-bp-tooltip-hide="<?php esc_html_e( 'Hide formatting', 'buddyboss' ); ?>" data-bp-tooltip-show="<?php esc_attr_e( 'Show formatting', 'buddyboss' ); ?>">
			<a href="#" id="show-toolbar-button" class="toolbar-button bp-tooltip">
				<span class="bb-icon bb-icon-text-format"></span>
			</a>
		</div>
	<div class="post-elements-buttons-item post-mention bp-tooltip" data-bp-tooltip-pos="up-right" data-bp-tooltip="<?php esc_attr_e( 'Mention someone', 'buddyboss' ); ?>">
		<span class="toolbar-button">
			<i class="bb-icon bb-icon-at-sign"></i>
		</span>
	</div>
	<?php if ( bp_is_active( 'media' ) && ( ( bp_is_activity_directory() && ( bp_is_profiles_emoji_support_enabled() || bp_is_groups_emoji_support_enabled() ) ) || ( bp_is_user_activity() && bp_is_profiles_emoji_support_enabled() ) || ( bp_is_group_activity() && bp_is_groups_emoji_support_enabled() ) ) ) : ?>
		<div class="post-elements-buttons-item post-emoji bp-tooltip" data-bp-tooltip-pos="up-right" data-bp-tooltip="<?php esc_attr_e( 'Emoji', 'buddyboss' ); ?>"></div>
	<?php endif; ?>
</script>
