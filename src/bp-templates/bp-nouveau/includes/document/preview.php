<?php

if(!defined(ABSPATH)){
	$pagePath = explode('/wp-content/', dirname(__FILE__));
	include_once(str_replace('wp-content/' , '', $pagePath[0] . '/wp-load.php'));
}

define('WP_USE_THEMES', true);

global $wpdb, $bp;

if ( empty( $_REQUEST ) && empty( $_REQUEST['id'] ) && empty( $_REQUEST['id1'] ) ) {
	echo '// Silence is golden.';
	exit();
}

$encode_id      = base64_decode( $_REQUEST['id'] );
$encode_id1     = base64_decode( $_REQUEST['id1'] );
$explode_arr    = explode( 'forbidden_', $encode_id);
$explode_arr1   = explode( 'forbidden_', $encode_id1);

if ( isset( $explode_arr ) && !empty( $explode_arr ) && isset( $explode_arr[1] ) && (int) $explode_arr[1] > 0 &&
     isset( $explode_arr1 ) && !empty( $explode_arr1 ) && isset( $explode_arr1[1] ) && (int) $explode_arr1[1] > 0  ) {
	$id                 = (int) $explode_arr[1];
	$id1                = (int) $explode_arr1[1];
	$document_privacy   = bp_document_user_can_manage_document( $id1, bp_loggedin_user_id() );
	$can_view           = ( true === (bool) $document_privacy['can_view'] ) ? true : false;
	if ( $can_view && wp_attachment_is_image( $id ) ) {
		$type = get_post_mime_type( $id );
		$output_file_src = bp_document_scaled_image_path( $id );
		header("Content-Type: $type");
		readfile("$output_file_src");
	} else {
		echo '// Silence is golden.';
		exit();
	}
} else {
	echo '// Silence is golden.';
	exit();
}

