<?php
/**
 * BuddyBoss Performance Topic Integration.
 *
 * @package BuddyBoss\Performance
 */

namespace BuddyBoss\Performance\Integration;

use BuddyBoss\Performance\Helper;
use BuddyBoss\Performance\Cache;

if ( ! defined( 'ABSPATH' ) ) {
	exit();
}

/**
 * Topic Integration Class.
 *
 * @package AppBoss\Performance
 */
class BB_Topics extends Integration_Abstract {


	/**
	 * Add(Start) Integration
	 *
	 * @return mixed|void
	 */
	public function set_up() {
		$this->register( 'bbp-topics' );

		$event_groups = array( 'bbpress', 'bbpress-topics' );

		$purge_events = array(
			'save_post_topic', // When topic created.
			'edit_post_topic', // When topic updated.
			'trashed_post', // When topic trashed.
			'untrashed_post', // When topic untrashed.
			'deleted_post', // When topic deleted.
			'bbp_merged_topic', // When topic merged as reply.
			'bbp_post_split_topic', // When topic split.
		);

		/**
		 * Add Custom events to purge forums endpoint cache
		 */
		$purge_events = apply_filters( 'bbplatform_cache_bbp_topics', $purge_events );
		$this->purge_event( 'bbp-topics', $purge_events );

		/**
		 * Support for single items purge
		 */
		$purge_single_events = array(
			'save_post_topic'                => 1, // When topic created.
			'edit_post_topic'                => 1, // When topic updated.
			'trashed_post'                   => 1, // When topic trashed.
			'untrashed_post'                 => 1, // When topic untrashed.
			'deleted_post'                   => 1, // When topic deleted.
			'bbp_add_user_subscription'      => 2, // When topic subscription added.
			'bbp_remove_user_subscription'   => 2, // When topic subscription removed.
			'bbp_add_user_favorite'          => 2, // When topic favorite added.
			'bbp_remove_user_favorite'       => 2, // When topic favorite removed.
			'bbp_opened_topic'               => 1, // When topic opened.
			'bbp_closed_topic'               => 1, // When topic closed.
			'bbp_spammed_topic'              => 1, // When topic spammed.
			'bbp_unspammed_topic'            => 1, // When topic unspammed.
			'bbp_stick_topic'                => 1, // When topic stick.
			'bbp_unstick_topic'              => 1, // When topic unstick.
			'bbp_approved_topic'             => 1, // When topic approved.
			'bbp_unapproved_topic'           => 1, // When topic unapproved.
			'bbp_merged_topic'               => 3, // When topic merged as reply.
			'bbp_post_split_topic'           => 3, // When topic split.
			'bbp_new_reply'                  => 3, // When new reply created, update count and last reply id and author id.
			'bbp_edit_reply'                 => 3, // When reply updated, update count and last reply id and author id.
			'bbp_post_move_reply'            => 3, // When reply moved, update count and last reply id and author id.

			// Add Author Embed Support.
			'profile_update'                 => 1, // User updated on site.
			'deleted_user'                   => 1, // User deleted on site.
			'xprofile_avatar_uploaded'       => 1, // User avatar photo updated.
			'bp_core_delete_existing_avatar' => 1, // User avatar photo deleted.
		);

		/**
		 * Add Custom events to purge single activity endpoint cache
		 */
		$purge_single_events = apply_filters( 'bbplatform_cache_bbp_topics', $purge_single_events );
		$this->purge_single_events( 'bbplatform_cache_purge_bbp-topics_single', $purge_single_events );

		$is_component_active = Helper::instance()->get_app_settings( 'cache_component', 'appboss' );
		$settings            = Helper::instance()->get_app_settings( 'cache_bb_forum_discussions', 'appboss' );
		$cache_bb_topics     = isset( $is_component_active ) && isset( $settings ) ? ( $is_component_active && $settings ) : false;

		if ( $cache_bb_topics ) {

			$this->cache_endpoint(
				'buddyboss/v1/topics',
				Cache::instance()->month_in_seconds * 60,
				$purge_events,
				$event_groups,
				array(
					'unique_id'         => 'id',
					'purge_deep_events' => array_keys( $purge_single_events ),
				),
				true
			);

			$this->cache_endpoint(
				'buddyboss/v1/topics/<id>',
				Cache::instance()->month_in_seconds * 60,
				array_keys( $purge_single_events ),
				$event_groups,
				array(),
				false
			);
		}
	}

	/**
	 * When topic created
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_save_post_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic updated
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_edit_post_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic trashed
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_trashed_post( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic untrashed
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_untrashed_post( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic deleted
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_deleted_post( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic subscription added
	 *
	 * @param int $user_id  User ID.
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_add_user_subscription( $user_id, $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic subscription removed
	 *
	 * @param int $user_id  User ID.
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_remove_user_subscription( $user_id, $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic favorite added
	 *
	 * @param int $user_id  User ID.
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_add_user_favorite( $user_id, $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic favorite removed
	 *
	 * @param int $user_id  User ID.
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_remove_user_favorite( $user_id, $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic opened
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_opened_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic closed
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_closed_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic spammed
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_spammed_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic unspammed
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_unspammed_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic stick
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_stick_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic unstick
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_unstick_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic approved
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_approved_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic unapproved
	 *
	 * @param int $topic_id Topic ID.
	 */
	public function event_bbp_unapproved_topic( $topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When topic merged as reply
	 *
	 * @param int $destination_topic_id  Destination ID.
	 * @param int $source_topic_id       Source Topic ID.
	 * @param int $source_topic_forum_id Source Forum ID.
	 */
	public function event_bbp_merged_topic( $destination_topic_id, $source_topic_id, $source_topic_forum_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $destination_topic_id );
		Cache::instance()->purge_by_group( 'bbp-topics_' . $source_topic_id );
	}

	/**
	 * When topic split
	 *
	 * @param int $from_reply_id        Reply ID.
	 * @param int $source_topic_id      Source Topic ID.
	 * @param int $destination_topic_id Desination Topic ID.
	 */
	public function event_bbp_post_split_topic( $from_reply_id, $source_topic_id, $destination_topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $destination_topic_id );
		Cache::instance()->purge_by_group( 'bbp-topics_' . $source_topic_id );
	}

	/**
	 * When new reply created, update count and last reply id and author id
	 *
	 * @param int $reply_id Reply ID.
	 * @param int $topic_id Topic ID.
	 * @param int $forum_id Forum ID.
	 */
	public function event_bbp_new_reply( $reply_id, $topic_id, $forum_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When reply updated, update count and last reply id and author id
	 *
	 * @param int $reply_id Reply ID.
	 * @param int $topic_id Topic ID.
	 * @param int $forum_id Forum ID.
	 */
	public function event_bbp_edit_reply( $reply_id, $topic_id, $forum_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
	}

	/**
	 * When reply moved, update count and last reply id and author id
	 *
	 * @param int $move_reply_id        Moved Reply ID.
	 * @param int $source_topic_id      Source Topic ID.
	 * @param int $destination_topic_id Desination Topic ID.
	 */
	public function event_bbp_post_move_reply( $move_reply_id, $source_topic_id, $destination_topic_id ) {
		Cache::instance()->purge_by_group( 'bbp-topics_' . $destination_topic_id );
		Cache::instance()->purge_by_group( 'bbp-topics_' . $source_topic_id );
	}

	/**
	 * User updated on site
	 *
	 * @param int $user_id User ID.
	 */
	public function event_profile_update( $user_id ) {
		$topic_ids = $this->get_topic_ids_by_userid( $user_id );
		if ( ! empty( $topic_ids ) ) {
			foreach ( $topic_ids as $topic_id ) {
				Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
			}
		}
	}

	/**
	 * User deleted on site
	 *
	 * @param int $user_id User ID.
	 */
	public function event_deleted_user( $user_id ) {
		$topic_ids = $this->get_topic_ids_by_userid( $user_id );
		if ( ! empty( $topic_ids ) ) {
			foreach ( $topic_ids as $topic_id ) {
				Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
			}
		}
	}

	/**
	 * User avatar photo updated
	 *
	 * @param int $user_id User ID.
	 */
	public function event_xprofile_avatar_uploaded( $user_id ) {
		$topic_ids = $this->get_topic_ids_by_userid( $user_id );
		if ( ! empty( $topic_ids ) ) {
			foreach ( $topic_ids as $topic_id ) {
				Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
			}
		}
	}

	/**
	 * User avatar photo deleted
	 *
	 * @param array $args Array of arguments used for avatar deletion.
	 */
	public function event_bp_core_delete_existing_avatar( $args ) {
		$user_id = ! empty( $args['item_id'] ) ? absint( $args['item_id'] ) : 0;
		if ( ! empty( $user_id ) ) {
			if ( isset( $args['object'] ) && 'user' === $args['object'] ) {
				$topic_ids = $this->get_topic_ids_by_userid( $user_id );
				if ( ! empty( $topic_ids ) ) {
					foreach ( $topic_ids as $topic_id ) {
						Cache::instance()->purge_by_group( 'bbp-topics_' . $topic_id );
					}
				}
			}
		}
	}

	/**
	 * Get Activities ids from user name.
	 *
	 * @param int $user_id User ID.
	 *
	 * @return array
	 */
	private function get_topic_ids_by_userid( $user_id ) {
		global $wpdb;
		$sql = $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type='topic' AND post_author = %d", $user_id );

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return $wpdb->get_col( $sql );
	}
}
