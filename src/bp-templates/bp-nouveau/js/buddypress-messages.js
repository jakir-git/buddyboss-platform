/* global wp, bp, BP_Nouveau, _, Backbone, tinymce, tinyMCE, bp_select2, bb_pusher_vars */
/* jshint devel: true */
/* @version 3.1.0 */
window.wp = window.wp || {};
window.bp = window.bp || {};

( function( exports, $ ) {

	// Bail if not set.
	if ( typeof BP_Nouveau === 'undefined' ) {
		return;
	}

	_.extend( bp, _.pick( wp, 'Backbone', 'ajax', 'template' ) );

	bp.Models      = bp.Models || {};
	bp.Collections = bp.Collections || {};
	bp.Views       = bp.Views || {};

	bp.Nouveau = bp.Nouveau || {};

	/**
	 * [Nouveau description]
	 *
	 * @type {Object}
	 */
	bp.Nouveau.Messages = {
		/**
		 * [start description]
		 *
		 * @return {[type]} [description]
		 */
		start: function() {
			this.views        = new Backbone.Collection();
			this.threads      = new bp.Collections.Threads();
			this.messages     = new bp.Collections.Messages();
			this.router       = new bp.Nouveau.Messages.Router();
			this.box          = 'inbox';
			this.mediumEditor = false;
			this.divider      = [];
			this.previous     = '';
			this.threadType   = 'unarchived';

			if ( ! _.isUndefined( window.Dropzone ) && ! _.isUndefined( BP_Nouveau.media ) ) {
				this.dropzoneView();
				this.dropzoneDocumentView();
				this.dropzoneVideoView();
			}

			this.setupNav();

			Backbone.history.start(
				{
					pushState: true,
					root: BP_Nouveau.messages.rootUrl
				}
			);

			// Listen to events ("Add hooks!").
			this.addListeners();

		},

		dropzoneView: function() {
			this.dropzone = null;

			// set up dropzones auto discover to false so it does not automatically set dropzones.
			window.Dropzone.autoDiscover = false;

			this.dropzone_options = {
				url                 		 : BP_Nouveau.ajaxurl,
				timeout             		 : 3 * 60 * 60 * 1000,
				dictFileTooBig      		 : BP_Nouveau.media.dictFileTooBig,
				dictDefaultMessage  		 : '',
				acceptedFiles       		 : 'image/*',
				autoProcessQueue    		 : true,
				addRemoveLinks      		 : true,
				uploadMultiple      		 : false,
				maxFiles            		 : typeof BP_Nouveau.media.maxFiles !== 'undefined' ? BP_Nouveau.media.maxFiles : 10,
				maxFilesize         		 : typeof BP_Nouveau.media.max_upload_size !== 'undefined' ? BP_Nouveau.media.max_upload_size : 2,
				thumbnailWidth				 : 140,
				thumbnailHeight				 : 140,
				dictMaxFilesExceeded		 : BP_Nouveau.media.media_dict_file_exceeded,
				dictCancelUploadConfirmation : BP_Nouveau.media.dictCancelUploadConfirmation,
			};

			// if defined, add custom dropzone options.
			if ( typeof BP_Nouveau.media.dropzone_options !== 'undefined' ) {
				Object.assign( this.dropzone_options, BP_Nouveau.media.dropzone_options );
			}
		},

		dropzoneDocumentView: function() {
			this.dropzone = null;

			// set up dropzones auto discover to false so it does not automatically set dropzones.
			window.Dropzone.autoDiscover = false;

			this.dropzone_document_options = {
				url                  		 : BP_Nouveau.ajaxurl,
				timeout              		 : 3 * 60 * 60 * 1000,
				dictFileTooBig       		 : BP_Nouveau.media.dictFileTooBig,
				acceptedFiles        		 : BP_Nouveau.media.document_type,
				createImageThumbnails		 : false,
				dictDefaultMessage   		 : '',
				autoProcessQueue     		 : true,
				addRemoveLinks       		 : true,
				uploadMultiple       		 : false,
				maxFiles             		 : typeof BP_Nouveau.document.maxFiles !== 'undefined' ? BP_Nouveau.document.maxFiles : 10,
				maxFilesize          		 : typeof BP_Nouveau.document.max_upload_size !== 'undefined' ? BP_Nouveau.document.max_upload_size : 2,
				dictInvalidFileType  		 : BP_Nouveau.document.dictInvalidFileType,
				dictMaxFilesExceeded 		 : BP_Nouveau.media.document_dict_file_exceeded,
				dictCancelUploadConfirmation : BP_Nouveau.media.dictCancelUploadConfirmation,
			};

		},

		dropzoneVideoView: function() {
			this.dropzone = null;

			// set up dropzones auto discover to false so it does not automatically set dropzones.
			window.Dropzone.autoDiscover = false;

			this.dropzone_video_options = {
				url                  		 : BP_Nouveau.ajaxurl,
				timeout              		 : 3 * 60 * 60 * 1000,
				dictFileTooBig       		 : BP_Nouveau.video.dictFileTooBig,
				acceptedFiles        		 : BP_Nouveau.video.video_type,
				createImageThumbnails		 : false,
				dictDefaultMessage   		 : '',
				autoProcessQueue     		 : true,
				addRemoveLinks       		 : true,
				uploadMultiple       		 : false,
				maxFiles             		 : typeof BP_Nouveau.video.maxFiles !== 'undefined' ? BP_Nouveau.video.maxFiles : 10,
				maxFilesize          		 : typeof BP_Nouveau.video.max_upload_size !== 'undefined' ? BP_Nouveau.video.max_upload_size : 2,
				dictInvalidFileType  		 : BP_Nouveau.video.dictInvalidFileType,
				dictMaxFilesExceeded 		 : BP_Nouveau.video.video_dict_file_exceeded,
				dictCancelUploadConfirmation : BP_Nouveau.video.dictCancelUploadConfirmation,
			};

		},

		setupNav: function() {
			var self = this;

			// First adapt the compose nav.
			$( '#compose-personal-li' ).addClass( 'last' );

			// Then listen to nav click and load the appropriate view.
			$( '#subnav a' ).on(
				'click',
				function( event ) {

					// Do nothing if it's dropdown
					if( $( event.currentTarget ).data( 'action' ) == 'more_options' ) {
						return event;
					}

					event.preventDefault();

					var view_id = $( event.target ).prop( 'id' );

					// Remove the editor to be sure it will be added dynamically later.
					self.removeTinyMCE();

					// The compose view is specific (toggle behavior).
					if ( 'compose' === view_id ) {
						self.router.navigate( 'compose/', { trigger: true } );
						$( event.target ).parents( '.bp-messages-container' ).removeClass( 'bp-view-message' ).addClass( 'bp-compose-message' );
						// Other views are classic.
					} else {

						if ( self.box !== view_id || ! _.isUndefined( self.views.get( 'compose' ) ) ) {
							self.clearViews();

							self.router.navigate( view_id + '/', { trigger: true } );
						}
					}
				}
			);
		},

		/**
		 * [addListeners description]
		 */
		addListeners: function () {

			$( document ).on( 'click', '.closeModalErrorPopup', this.closeModalPopup.bind( this ) );
			/**
			 * Pagination for message block list
			 */

			$( document ).on( 'click', '#view_more_members, .view_other_members', this.messageMemberModel.bind( this ) );

			// $( document ).on( 'click', '.view_more_members', this.messageBlockListPagination );
			$( document ).on( 'click', '#bp-message-thread-header .mass-block-member, .bb_more_options_list .mass-block-member', this.messageModeratorMemberList );
			$( document ).on( 'click', '#mass-user-block-list a.block-member', this.messageBlockMember );
			$( document ).on( 'click', '#mass-user-block-list .mfp-close', this.clearModeratedMessageList );
			$( document ).on( 'click', '.page-data a.load_more_rl', this.messageBlockListPagination );
			$( document ).on( 'click', '#compose-action-personal-li .bb_more_options_action', this.toggleMessageCompose );

		},

		triggerLoadMore: function () {

			if( jQuery( this ).find( '#load_more_rl' ).length == 0 || jQuery( this ).find( '#load_more_rl' ).hasClass( 'loading') || jQuery( this ).find( '#load_more_rl' ).hasClass( 'hidden') ) {
				return;
			}

			if( jQuery( this ).offset().top + jQuery( this ).innerHeight() > jQuery( this ).find( '#load_more_rl' ).offset().top ) {
				jQuery( this ).find( '#load_more_rl' ).trigger( 'click' );
			}

		},

		toggleMessageCompose: function ( e ) {
			$( e.currentTarget ).closest( '#compose-action-personal-li' ).toggleClass( 'optionsOpen' );
		},

		closeModalPopup: function ( event ) {
			event.preventDefault();

			$( '.open-popup' ).remove();
		},

		removeTinyMCE: function() {
			if ( typeof tinymce !== 'undefined' ) {
				var editor = tinymce.get( 'message_content' );

				if ( editor !== null ) {
					tinymce.EditorManager.execCommand( 'mceRemoveEditor', true, 'message_content' );
				}
			}
		},

		tinyMCEinit: function() {
			if ( typeof window.tinyMCE === 'undefined' || window.tinyMCE.activeEditor === null || typeof window.tinyMCE.activeEditor === 'undefined' ) {
				return;
			} else {
				$( window.tinyMCE.activeEditor.contentDocument.activeElement )
					.atwho( 'setIframe', $( '#message_content_ifr' )[0] )
					.bp_mentions(
						{
							data: [],
							suffix: ' '
						}
					);
			}
		},

		removeFeedback: function() {
			var feedback;

			if ( ! _.isUndefined( this.views.get( 'feedback' ) ) ) {
				feedback = this.views.get( 'feedback' );
				this.views.remove( { id: 'feedback', view: feedback } );

				// Not remove 'notice' feedback.
				if ( _.isUndefined( feedback.get( 'view' ).model.attributes.type ) || 'notice' !== feedback.get( 'view' ).model.attributes.type ) {
					feedback.get( 'view' ).remove();
					$( '.bp-messages-content-wrapper' ).removeClass( 'has_info' );
					$( '.bp-messages-content' ).removeClass( 'has_info' );
					$( '.bp-messages-nav-panel' ).removeClass( 'has_info' );
				}
			}
		},

		displayFeedback: function( message, type ) {
			var feedback;

			// Make sure to remove the feedbacks.
			this.removeFeedback();

			if ( ! message ) {
				return;
			}

			feedback = new bp.Views.Feedback(
				{
					value: message,
					type:  type || 'info'
				}
			);

			this.views.add( { id: 'feedback', view: feedback } );

			if ( 'notice' === type ) {
				feedback.inject( '.bp-messages-notice' );
			} else {
				feedback.inject( '.bp-messages-feedback' );
			}

			$( '.bp-messages-content-wrapper' ).addClass( 'has_info' );
		},

		displayComposeFeedback: function( message, type ) {
			var feedback;

			// Make sure to remove the feedbacks.
			this.removeFeedback();

			if ( ! message ) {
				return;
			}

			feedback = new bp.Views.Feedback(
				{
					value: message,
					type:  type || 'info'
				}
			);

			this.views.add( { id: 'feedback', view: feedback } );
			feedback.inject( '.compose-feedback' );

			$( '.bp-messages-content' ).addClass( 'has_info' );
		},

		displaySendMessageFeedback: function( message, type ) {
			var feedback;

			// Make sure to remove the feedbacks.
			this.removeFeedback();

			if ( ! message ) {
				return;
			}

			feedback = new bp.Views.Feedback(
				{
					value: message,
					type:  type || 'info'
				}
			);

			this.views.add( { id: 'feedback', view: feedback } );

			feedback.inject( '.bp-send-message-notices' );

			$( '.bp-messages-content-wrapper' ).addClass( 'has_info' );
		},

		displaySearchFeedback: function( message, type ) {
			var feedback;

			// Make sure to remove the feedbacks.
			this.removeFeedback();

			if ( ! message ) {
				return;
			}

			feedback = new bp.Views.Feedback(
				{
					value: message,
					type:  type || 'info'
				}
			);

			this.views.add( { id: 'feedback', view: feedback } );

			feedback.inject( '.bp-messages-search-feedback' );

			$( '.bp-messages-nav-panel' ).addClass( 'has_info' );
		},

		clearViews: function() {
			// Clear views.
			if ( ! _.isUndefined( this.views.models ) ) {
				_.each(
					this.views.models,
					function( model ) {
						model.get( 'view' ).remove();
					},
					this
				);

				this.views.reset();
			}
		},

		composeView: function() {
			// Remove all existing views.

			var threadView = false;
			if ( ! _.isUndefined( this.views.models ) ) {
				_.each(
					this.views.models,
					function( model ) {
						if ( model.get( 'id' ) === 'threads' ) {
							threadView = true;
						}
					},
					this
				);
			}

			if ( ! threadView || ! this.threads.length ) {
				this.threadsView();
			}

			// Create the loop view.
			var form = new bp.Views.messageForm(
				{
					model: new bp.Models.Message()
				}
			);

			// Activate the appropriate nav.
			$( '#subnav ul li' ).removeClass( 'current selected' );
			$( '#subnav a#compose' ).closest( 'li' ).addClass( 'current selected' );

			this.views.add( { id: 'compose', view: form } );

			form.inject( '.bp-messages-content' );

			$( '.bp-messages-content').prepend( '<div class="compose-feedback"></div>' );

			// show compose message screen.
			$( '.bp-messages-container' ).removeClass( 'bp-view-message' ).addClass( 'bp-compose-message' );
		},

		threadsView: function() {

			if ( this.box === 'inbox' ) {
				$( '.bp-messages-content' ).html( '' );
			}

			// Activate the appropriate nav.
			$( '#subnav ul li' ).removeClass( 'current selected' );
			$( '#subnav a#' + this.box ).closest( 'li' ).addClass( 'current selected' );

			// Create the loop view.
			var threads_list = new bp.Views.userThreads( { collection: this.threads, box: this.box } );

			this.views.add( { id: 'threads', view: threads_list } );

			threads_list.inject( '.bp-messages-threads-list' );

			// Attach filters.
			this.displayFilters( this.threads );
		},

		displayFilters: function( collection ) {
			var filters_view;

			// Create the model.
			this.filters = new Backbone.Model(
				{
					'page'         : 1,
					'total_page'   : 0,
					'search_terms' : '',
					'box'          : this.box
				}
			);

			if ( collection.length ) {
				// Use it in the filters viex.
				filters_view = new bp.Views.messageFilters( {model: this.filters, threads: collection} );

				this.views.add( {id: 'filters', view: filters_view} );

				filters_view.inject( '.bp-messages-filters' );

				$( '.bp-messages-threads-list .message-lists > li .thread-subject' ).each( function() {
					var available_width = $( this ).width() - 10;
					var date_width = $( this ).find( '.thread-date' ).width();
					$( this ).find( '.thread-excerpt' ).css( { 'max-width': available_width - date_width } );
					$( this ).find( '.typing-indicator' ).css( { 'max-width': available_width - date_width } );
				});

			}
		},

		singleView: function( thread ) {

			this.box = 'single';

			// Remove the editor to be sure it will be added dynamically later.
			this.removeTinyMCE();

			var threadView = false;
			if ( ! _.isUndefined( this.views.models ) ) {
				_.each(
					this.views.models,
					function( model ) {
						if ( model.get( 'id' ) === 'threads' ) {
							threadView = true;
						}
					},
					this
				);
			}

			if ( ! threadView || ! this.threads.length ) {

				// Set has threads explicitly true if single view is on because obviously.
				BP_Nouveau.messages.hasThreads = true;

				// Remove all existing views except threads view.
				this.clearViews();

				this.threadsView();
			}

			// Create the single thread view.
			var single_thread = new bp.Views.userMessages( { collection: this.messages, thread: thread } );

			this.views.add( { id: 'single', view: single_thread } );

			single_thread.inject( '.bp-messages-content' );
		},

		messageMemberModel: function( e ) {
			e.preventDefault();
			var $this   = $( e.currentTarget ).hasClass( 'view_other_members' ) ? $( e.currentTarget ) : $( e.target );
			var current = $this.parents( '.thread-participants' ).find( '#view_more_members' );

			if ( current.length == 0 ) {
				current = $this;
			}

			if ( current.length > 0 ) {
				var currentHref = current.attr( 'href' );
				if ( currentHref ) {
					current.magnificPopup(
						{
							items: {
								src: currentHref,
								type: 'inline'
							},
						}
					).magnificPopup( 'open' );

					bp.Nouveau.Messages.messageMemberList( e );
				}
			}
		},

		messageMemberList: function ( e ) {
			e.preventDefault();
			var $this   = $( e.currentTarget ).hasClass( 'view_other_members' ) ? $( e.currentTarget ) : $( e.target );
			var current = $this.parents( '.thread-participants' ).find( '#view_more_members' );
			if ( current.length == 0 ) {
				current = $this;
			}
			var postData = {
				'page_no': current.attr( 'data-cp' ),
				'thread_id': current.attr( 'data-thread-id' ),
				'message_id': current.attr( 'data-message-id' ),
				'message_type': current.attr( 'data-message-type' ),
				'exclude_current_user': true,
				'exclude_moderated_members': false,
			};

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: {
						action: $this.hasClass( 'view_other_members' ) ? 'messages_left_join_members_list' : 'messages_moderated_recipient_list',
						post_data: postData,
					},
					beforeSend: function () {
						$( '#message-members-list #members_list' ).empty().removeClass( 'is_not_empty' );
					},
					success: function ( response ) {
						if ( response.success && response.data && '' !== response.data.content ) {
							if ( $( '#message-members-list #members_list' ).length > 0 ) {
								$( '#message-members-list #members_list' ).html( response.data.content ).addClass( 'is_not_empty' );
								if ( ! $( '#message-members-list' ).hasClass( 'event-triggered' ) ) {
									$( '#message-members-list .modal-container' ).on( 'scroll', bp.Nouveau.Messages.triggerLoadMore );
									$( '#message-members-list .modal-container' ).addClass( 'event-triggered' );
								}
							}
						}
					},
				}
			);
		},

		/**
		 * Pagination for message block list
		 * @returns {boolean}
		 */
		messageBlockListPagination: function ( e ) {
			e.preventDefault();
			if ( $( '#view_more_members' ).length ) {
				$( '#view_more_members' ).removeClass( 'view_more_members' );
			}
			if ( $( '#load_more_rl' ).length ) {
				$( '#load_more_rl' ).removeClass( 'load_more_rl' );
			}
			var $this       = $( this );
			var bpAction    = $this.attr( 'data-action' );
			var threadId    = parseInt( $this.attr( 'data-thread-id' ) );
			var currentPage = parseInt( $this.attr( 'data-cp' ) );
			var totalPages  = parseInt( $this.attr( 'data-tp' ) );
			var postData    = {
				'page_no': currentPage,
				'thread_id': threadId,
				'exclude_current_user': true,
				'exclude_moderated_members': 'bp_load_more' === bpAction ? true : false,
			};

			if ( $this.parents( '#members_list' ).length > 0 ) {
				postData.exclude_moderated_members = false;
			}

			$.ajax( {
				type: 'POST',
				url: BP_Nouveau.ajaxurl,
				data: {
					action: 'messages_recipient_list_for_blocks',
					post_data: postData,
				},
				beforeSend: function () {
					$( '#load_more_rl' ).addClass( 'loading' );
				},
				success: function ( response ) {
					if ( response.success && response.data && '' !== response.data.content ) {
						var moderation_type = response.data.recipients.moderation_type;
						var memberData      = response.data.recipients.members;
						if ( memberData ) {
							$.each( memberData, function ( index, item ) {
								if ( '' !== item ) {
									if ( 'bp_load_more' === bpAction ) {
										var cloneUserItemWrap = $( '.user-item-wrp:last' ).clone();
										cloneUserItemWrap.attr( 'id', 'user-' + item.id );
										cloneUserItemWrap.find( '.user-avatar img' ).attr( 'src', item.avatar );
										cloneUserItemWrap.find( '.user-avatar img' ).attr( 'alt', item.user_name );
										cloneUserItemWrap.find( '.user-avatar > a' ).attr( 'href', item.user_link );
										cloneUserItemWrap.find( '.user-name' ).html( '<a href="' + item.user_link + '">' + item.user_name + '</a>' );
										if ( true === item.is_blocked ) {
											cloneUserItemWrap.find( '.user-actions .block-member' ).removeAttr( 'data-bp-content-id' );
											cloneUserItemWrap.find( '.user-actions .block-member' ).attr( 'data-bp-content-type' );
											cloneUserItemWrap.find( '.user-actions .block-member' ).attr( 'data-bp-nonce' );
											cloneUserItemWrap.find( '.user-actions .block-member' ).html( 'Blocked' );
											cloneUserItemWrap.find( '.user-actions .block-member' ).removeClass( 'block-member' ).addClass( 'blocked-member disabled' );
										} else if ( false !== item.can_be_blocked ) {
											cloneUserItemWrap.find( '.user-actions a.button' ).removeClass( 'blocked-member disabled' ).addClass( 'block-member' );
											cloneUserItemWrap.find( '.user-actions .block-member' ).attr( 'id', 'report-content-' + moderation_type + '-' + item.id );
											cloneUserItemWrap.find( '.user-actions .block-member' ).attr( 'data-bp-content-id', item.id );
											cloneUserItemWrap.find( '.user-actions .block-member' ).attr( 'data-bp-content-type', moderation_type );
											cloneUserItemWrap.find( '.user-actions .block-member' ).attr( 'data-bp-nonce', BP_Nouveau.nonce.bp_moderation_content_nonce );
											cloneUserItemWrap.find( '.user-actions .block-member' ).html( 'Block' );
										}
										$( '.user-item-wrp:last' ).after( cloneUserItemWrap );
									}
									if ( 'bp_view_more' === bpAction ) {
										var oldSpanTagTextNode = document.createTextNode( ', ' );
										var cloneParticipantsName = $( '.participants-name:last' ).clone();
										cloneParticipantsName.find( 'a' ).attr( 'href', item.user_link );
										cloneParticipantsName.find( 'a' ).html( item.user_name );
										cloneParticipantsName.find( 'a' ).append( oldSpanTagTextNode );
										if ( parseInt( index ) !== parseInt( Object.keys( memberData ).length ) || cloneParticipantsName ) {
											$( '.participants-name:last' ).find( 'a' ).append( oldSpanTagTextNode );
										}
										$( '.participants-name:last' ).after( cloneParticipantsName );
									}
								}
							} );
						}
						if ( totalPages === currentPage ) {
							if ( 'bp_load_more' === bpAction ) {
								$( '#load_more_rl' ).addClass( 'hidden' ).hide();
							}
							if ( 'bp_view_more' === bpAction ) {
								$( '#view_more_members' ).hide();
								$( '.participants-name:last a' ).get( 0 ).nextSibling.remove();
							}
						} else {
							currentPage++;
							$this.attr( 'data-cp', currentPage );
						}
					}
				},
				complete: function () {
					$( '#load_more_rl' ).removeClass( 'loading' );
					if ( $( '#load_more_rl' ).length ) {
						$( '#load_more_rl' ).addClass( 'load_more_rl' );
					}
					if ( $( '#view_more_members' ).length ) {
						$( '#view_more_members' ).addClass( 'view_more_members' );
					}
				},
			} );
			return false;
		},

		messageBlockMember: function ( e ) {
			e.preventDefault();
			var contentId    = $( this ).data( 'bp-content-id' );
			var contentType  = $( this ).data( 'bp-content-type' );
			var nonce        = $( this ).data( 'bp-nonce' );
			var currentHref  = $( this ).attr( 'href' );

			if ( 'undefined' !== typeof contentId && 'undefined' !== typeof contentType && 'undefined' !== typeof nonce ) {
				$( document ).find( '.bp-report-form-err' ).empty();
				var mf_content = $( currentHref );
				mf_content.find( '.bp-content-id' ).val( contentId );
				mf_content.find( '.bp-content-type' ).val( contentType );
				mf_content.find( '.bp-nonce' ).val( nonce );
			}
			if ( $( '#mass-user-block-list a.block-member' ).length > 0 ) {
				$( '#mass-user-block-list a.block-member' ).magnificPopup(
					{
						items: {
							src: currentHref,
							type: 'inline'
						},
					}
				).magnificPopup( 'open' );
			}
		},

		messageModeratorMemberList: function ( e ) {
			e.preventDefault();
			var postData = {
				'page_no': $( this ).attr( 'data-cp' ),
				'thread_id': $( this ).attr( 'data-thread-id' ),
				'exclude_current_user': true,
				'exclude_moderated_members': true,
			};
			var currentHref = $( this ).attr( 'href' );
			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: {
						action: 'messages_moderated_recipient_list',
						post_data: postData,
					},
					beforeSend: function () {
						if ( $( '.mass-block-member' ).length > 0 ) {
							$( '.mass-block-member' ).magnificPopup(
								{
									items: {
										src: currentHref,
										type: 'inline'
									},
								}
							).magnificPopup( 'open' );
						}
					},
					success: function ( response ) {
						if ( response.success && response.data && '' !== response.data.content ) {
							if ( $( '#mass-user-block-list #moderated_user_list' ).length > 0 ) {
								$( '#mass-user-block-list #moderated_user_list' ).html( response.data.content ).addClass( 'is_not_empty' );
								if( !$( '#mass-user-block-list' ).hasClass( 'event-triggered' ) ) {
									$( '#mass-user-block-list .modal-container' ).on( 'scroll', bp.Nouveau.Messages.triggerLoadMore );
									$( '#mass-user-block-list .modal-container' ).addClass( 'event-triggered' );
								}
							}
						}
					},
				}
			);
		},

		clearModeratedMessageList: function () {
			if ( $( '#moderated_user_list' ).length > 0 ) {
				$( '#moderated_user_list' ).html( '' ).removeClass( 'is_not_empty' );
			}
		},

		threadAction: function ( event, obj ) {

			var action    = $( event.currentTarget ).data( 'bp-action' ),
				options   = {},
				attribute = {},
				opposite  = {},
				feedback  = BP_Nouveau.messages.doingAction,
				thread_id = 0,
				model;

			if ( ! action ) {
				return event;
			}

			event.preventDefault();

			if ( ! _.isUndefined( obj.options.box ) && 'single' === obj.options.box ) {
				thread_id = $( event.currentTarget ).closest( '.bb_more_options_list' ).data( 'bp-thread-id' );
				attribute = obj.collection.models.filter(
					function ( el ) {
						return el.id === thread_id;
					}
				);

				if ( _.isUndefined( attribute.length ) || 0 === attribute.length ) {
					return event;
				}

				attribute = _.first( attribute );

				model = new bp.Models.messageThread( attribute.attributes );
				model.set( attribute.attributes );

			} else {
				if ( ! obj.model.get( 'id' ) ) {
					return event;
				}

				model     = obj.model;
				thread_id = model.get( 'id' );
			}

			$( event.currentTarget ).closest( '.message_action__list' ).removeClass( 'open' ).closest( '.message_actions' ).removeClass( 'open' );

			if ( 'star' === action || 'unstar' === action ) {
				opposite = {
					'star'  : 'unstar',
					'unstar' : 'star'
				};

				options.data = {
					'star_nonce' : model.get( 'star_nonce' )
				};

				$( event.currentTarget ).addClass( 'bp-hide' );
				$( event.currentTarget ).parent().find( '[data-bp-action="' + opposite[ action ] + '"]' ).removeClass( 'bp-hide' );

			} else if ( 'read' === action || 'unread' === action ) {
				opposite = {
					'read'  : 'unread',
					'unread' : 'read'
				};

				var read_unread_div = $( '.message_action__list[data-bp-thread-id="' + thread_id + '"]' ),
					read_unread     = read_unread_div.find( '[data-bp-action="read"]' );

				if ( _.isUndefined( read_unread.length ) || ( ! _.isUndefined( read_unread.length ) && 0 === read_unread.length ) ) {
					read_unread = read_unread_div.find( '[data-bp-action="unread"]' );
				}

				read_unread.data( 'bp-action', opposite[ action ] );
				read_unread.html( read_unread.data( 'mark-' + opposite[ action ] + '-text' ) );
				read_unread.parent( 'li' ).removeClass( action ).addClass( opposite[ action ] );
			}

			if ( ! _.isUndefined( feedback[ action ] ) ) {
				bp.Nouveau.Messages.displayFeedback( feedback[ action ], 'loading' );
			}

			if ( 'delete' === action || 'delete_thread' === action ) {
				if ( $( '.message_actions .message_action__anchor' ).length ) {
					$( '.message_actions .message_action__anchor' ).trigger( 'click' );
				}
			}

			if ( 'delete' === action ) {
				if ( ! confirm( BP_Nouveau.messages.delete_confirmation ) ) {
					bp.Nouveau.Messages.removeFeedback();
					return;
				}
			}

			if ( 'delete_thread' === action ) {
				if ( ! confirm( BP_Nouveau.messages.delete_thread_confirmation ) ) {
					bp.Nouveau.Messages.removeFeedback();
					return;
				}
			}

			bp.Nouveau.Messages.threads.doAction( action, thread_id, options ).done(
				function( response ) {

					// Remove previous feedback.
					bp.Nouveau.Messages.removeFeedback();

					// Remove all views.
					if ( 'delete_thread' === action || 'hide_thread' === action ) {
						if ( bp.Nouveau.Messages.threads.length > 1 ) {
							// bp.Nouveau.Messages.clearViews();
							// Navigate back to current box.
							bp.Nouveau.Messages.threads.remove( bp.Nouveau.Messages.threads.get( thread_id ) );
							bp.Nouveau.Messages.router.navigate( 'view/' + bp.Nouveau.Messages.threads.at( 0 ).id + '/', { trigger: true } );
						} else {
							BP_Nouveau.messages.hasThreads = false;
							bp.Nouveau.Messages.router.navigate( 'compose/', { trigger: true } );
						}
					} else if ( 'unhide_thread' === action ) {
						// Remove previous feedback.
						bp.Nouveau.Messages.removeFeedback();
						if ( bp.Nouveau.Messages.threads.length > 1 ) {
							// Navigate back to current box.
							bp.Nouveau.Messages.threads.remove( bp.Nouveau.Messages.threads.get( thread_id ) );
							bp.Nouveau.Messages.router.navigate( 'archived/view/' + bp.Nouveau.Messages.threads.at( 0 ).id + '/', { trigger: true } );
							window.Backbone.trigger( 'relistelements' );
						} else {
							window.Backbone.trigger( 'relistelements' );
							BP_Nouveau.messages.hasThreads = false;
							bp.Nouveau.Messages.router.navigate( 'archived/', { trigger: true } );
						}
					} else if ( response.id ) {
						bp.Nouveau.Messages.displayFeedback( response.feedback, response.type );
						if ( undefined !== response.messages_count && 0 === response.messages_count ) {
							if ( bp.Nouveau.Messages.threads.length > 1 ) {
								bp.Nouveau.Messages.threads.remove( response.id );
								bp.Nouveau.Messages.router.navigate( 'view/' + bp.Nouveau.Messages.threads.at( 0 ).id + '/', { trigger: true } );
							} else {
								BP_Nouveau.messages.hasThreads = false;
								bp.Nouveau.Messages.threads.remove( response.id );
								bp.Nouveau.Messages.router.navigate( 'view/?refresh=1', { trigger: true } );
								bp.Nouveau.Messages.router.navigate( 'compose/', { trigger: true } );
							}
						} else {
							bp.Nouveau.Messages.router.navigate( 'view/' + response.id + '/?refresh=1', { trigger: true } );
							bp.Nouveau.Messages.router.navigate( 'view/' + response.id + '/', { trigger: true } );
						}
					} else if ( response.messages ) {

						model.set( _.first( response.messages ) );

						// Display the feedback.
						bp.Nouveau.Messages.displayFeedback( response.feedback, response.type );

						if ( 'unread' === action && ! _.isUndefined( response.ids ) ) {
							$( '.bp-compose-message.bp-messages-container, .bp-view-message.bp-messages-container' ).removeClass( 'bp-compose-message bp-view-message' );
							$.each(
								response.ids,
								function( index, value ) {
									$( '#bp-messages-threads-list .message-lists .thread-item.' + value ).addClass( 'unread' );
								}
							);
						} else if ( 'read' === action && ! _.isUndefined( response.ids ) ) {
							$( '.bp-compose-message.bp-messages-container, .bp-view-message.bp-messages-container' ).removeClass( 'bp-compose-message bp-view-message' );
							$.each(
								response.ids,
								function( index, value ) {
									$( '#bp-messages-threads-list .message-lists .thread-item.' + value ).removeClass( 'unread' );
								}
							);
						}

						bp.Nouveau.Messages.removeFeedback();
					}
				}
			).fail(
				function( response ) {
					// Remove previous feedback.
					bp.Nouveau.Messages.removeFeedback();

					bp.Nouveau.Messages.displayFeedback( response.feedback, response.type );
				}
			);

		},

		singleNoArchivedThreadView: function() {

			this.box = 'single';

			// Remove the editor to be sure it will be added dynamically later.
			this.removeTinyMCE();

			// Create the single thread view.
			var single_thread = new bp.Views.userArchivedNoThreads();

			this.views.add( { id: 'single', view: single_thread } );

			single_thread.inject( '.bp-messages-content' );
		},
	};

	bp.Models.Message = Backbone.Model.extend(
		{
			defaults: {
				send_to         : [],
				subject         : '',
				message_content : '',
				meta            : {}
			},

			sendMessage: function() {
				if ( true === this.get( 'sending' ) ) {
					return;
				}

				this.set( 'sending', true, { silent: true } );

				var sent = bp.ajax.post(
					'messages_send_message',
					_.extend(
						{
							nonce: BP_Nouveau.messages.nonces.send
						},
						this.attributes
					)
				);

				this.set( 'sending', false, { silent: true } );

				return sent;
			}
		}
	);

	bp.Models.Thread = Backbone.Model.extend(
		{
			defaults: {
				id            : 0,
				message_id    : 0,
				subject       : '',
				excerpt       : '',
				content       : '',
				unread        : true,
				sender_name   : '',
				sender_link   : '',
				sender_avatar : '',
				is_user_blocked   : false,
				is_user_suspended   : false,
				count         : 0,
				date          : 0,
				display_date  : '',
				recipients    : []
			},

			updateReadState: function( options ) {
				options 	 = options || {};
				options.data = _.extend(
					_.pick( this.attributes, ['id', 'message_id'] ),
					{
						action : 'messages_thread_read',
						nonce  : BP_Nouveau.nonces.messages
					}
				);

				return bp.ajax.send( options );
			}
		}
	);

	bp.Models.messageThread = Backbone.Model.extend(
		{
			defaults: {
				id            : 0,
				content       : '',
				sender_id     : 0,
				sender_name   : '',
				sender_link   : '',
				is_user_blocked   : false,
				is_user_suspended   : false,
				sender_avatar : '',
				date          : 0,
				display_date  : ''
			}
		}
	);

	bp.Collections.Threads = Backbone.Collection.extend(
		{
			model: bp.Models.Thread,

			initialize : function() {
				this.options = { page: 1, total_page: 0 };
			},

			sync: function( method, model, options ) {
				options         = options || {};
				options.context = this;
				options.data    = options.data || {};

				// Add generic nonce.
				options.data.nonce       = BP_Nouveau.nonces.messages;
				options.data.thread_type = bp.Nouveau.Messages.threadType;

				if ( 'read' === method ) {
					options.data = _.extend(
						options.data,
						{
							action: 'messages_get_user_message_threads'
						}
					);

					return bp.ajax.send( options );
				}
			},

			parse: function( resp ) {

				if ( ! _.isArray( resp.threads ) ) {
					resp.threads = [resp.threads];
				}

				_.each(
					resp.threads,
					function( value, index ) {
						if ( _.isNull( value ) ) {
							return;
						}

						resp.threads[index].id                = value.id;
						resp.threads[index].message_id        = value.message_id;
						resp.threads[index].subject           = value.subject;
						resp.threads[index].excerpt           = value.excerpt;
						resp.threads[index].content           = value.content;
						resp.threads[index].unread            = value.unread;
						resp.threads[index].sender_name       = value.sender_name;
						resp.threads[index].sender_link       = value.sender_link;
						resp.threads[index].sender_avatar     = value.sender_avatar;
						resp.threads[index].is_user_blocked   = value.is_user_blocked;
						resp.threads[index].is_user_suspended = value.is_user_suspended;
						resp.threads[index].count             = value.count;
						resp.threads[index].date              = new Date( value.date );
						resp.threads[index].display_date      = value.display_date;
						resp.threads[index].recipients        = value.recipients;
						resp.threads[index].star_link         = value.star_link;
						resp.threads[index].is_starred        = value.is_starred;
					}
				);

				if ( ! _.isUndefined( resp.meta ) ) {
					this.options.page       = resp.meta.page;
					this.options.total_page = resp.meta.total_page;
				}

				if ( bp.Nouveau.Messages.box ) {
					this.options.box = bp.Nouveau.Messages.box;
				}

				if ( ! _.isUndefined( resp.extraContent ) ) {
					_.extend(
						this.options,
						_.pick(
							resp.extraContent,
							[
								'beforeLoop',
								'afterLoop'
							]
						)
					);
				}

				return resp.threads;
			},

			doAction: function( action, ids, options ) {
				options         = options || {};
				options.context = this;
				options.data    = options.data || {};

				options.data = _.extend(
					options.data,
					{
						action: 'messages_' + action,
						nonce : BP_Nouveau.nonces.messages,
						id    : ids
					}
				);

				return bp.ajax.send( options );
			}
		}
	);

	bp.Collections.Messages = Backbone.Collection.extend(
		{
			before: null,
			model: bp.Models.messageThread,
			options: {},
			thread_messages: null,

			sync: function( method, model, options ) {
				options         = options || {};
				options.context = this;
				options.data    = options.data || {};

				// Add generic nonce.
				options.data.nonce = BP_Nouveau.nonces.messages;

				if ( 'read' === method ) {
					options.data = _.extend(
						options.data,
						{
							action     : 'messages_get_thread_messages',
							before     : this.before,
							thread_type: bp.Nouveau.Messages.threadType
						}
					);

					if ( this.thread_messages ) {
						this.thread_messages.abort();
					}

					this.thread_messages = bp.ajax.send( options );

					return this.thread_messages;
				}

				if ( 'create' === method ) {
					options.data = _.extend(
						options.data,
						{
							action : 'messages_send_reply',
							nonce  : BP_Nouveau.messages.nonces.send,
							hash   : Math.round( (new Date()).getTime() / 1000 )
						},
						model || {}
					);

					return bp.ajax.send( options );
				}
			},

			parse: function( resp ) {

				if ( ! _.isArray( resp.messages ) ) {
					resp.messages = [resp.messages];
				}

				this.before = resp.next_messages_timestamp;

				_.each(
					resp.messages,
					function( value, index ) {
						if ( _.isNull( value ) ) {
							return;
						}

						resp.messages[index].id                = value.id;
						resp.messages[index].content           = value.content;
						resp.messages[index].sender_id         = value.sender_id;
						resp.messages[index].sender_name       = value.sender_name;
						resp.messages[index].sender_link       = value.sender_link;
						resp.messages[index].sender_avatar     = value.sender_avatar;
						resp.messages[index].is_user_blocked   = value.is_user_blocked;
						resp.messages[index].is_user_suspended = value.is_user_suspended;
						resp.messages[index].date              = new Date( value.date );
						resp.messages[index].display_date      = value.display_date;
						resp.messages[index].star_link         = value.star_link;
						resp.messages[index].is_starred        = value.is_starred;
					}
				);

				if ( ! _.isUndefined( resp.thread ) ) {
					this.options.thread_id      = resp.thread.id;
					this.options.thread_subject = resp.thread.subject;
					this.options.recipients     = resp.thread.recipients;
				}

				// Access Control Document Support.
				if ( ! _.isUndefined( resp.user_can_upload_document ) && $( '#whats-new-messages-toolbar .post-media-document-support' ).length ) {
					if ( resp.user_can_upload_document ) {
						$( '#whats-new-messages-toolbar .post-media-document-support' ).show();
					} else {
						$( '#whats-new-messages-toolbar .post-media-document-support' ).hide();
					}

				}

				// Access Control Media Support.
				if ( ! _.isUndefined( resp.user_can_upload_media ) && $( '#whats-new-messages-toolbar .post-media-photo-support' ).length ) {
					if ( resp.user_can_upload_media ) {
						$( '#whats-new-messages-toolbar .post-media-photo-support' ).show();
					} else {
						$( '#whats-new-messages-toolbar .post-media-photo-support' ).hide();
					}

				}

				// Access Control Video Support.
				if ( ! _.isUndefined( resp.user_can_upload_video ) && $( '#whats-new-messages-toolbar .post-media-video-support' ).length ) {
					if ( resp.user_can_upload_video ) {
						$( '#whats-new-messages-toolbar .post-media-video-support' ).show();
					} else {
						$( '#whats-new-messages-toolbar .post-media-video-support' ).hide();
					}

				}

				// Access Control GiF Support.
				if ( ! _.isUndefined( resp.user_can_upload_gif ) && $( '#whats-new-messages-toolbar .post-media-gif-support' ).length ) {
					if ( resp.user_can_upload_gif ) {
						$( '#whats-new-messages-toolbar .post-media-gif-support' ).show();
					} else {
						$( '#whats-new-messages-toolbar .post-media-gif-support' ).hide();
					}

				}

				// Access Control Emoji Support.
				if ( ! _.isUndefined( resp.user_can_upload_emoji ) && $( '#whats-new-formatting-toolbar .post-media-emoji-support' ).length ) {
					if ( resp.user_can_upload_emoji ) {
						$( '#whats-new-formatting-toolbar .post-media-emoji-support' ).show();
					} else {
						$( '#whats-new-formatting-toolbar .post-media-emoji-support' ).hide();
					}

				}

				var finalMessagesArray = [], dividerMessageObject = {};
				var thread_start_date = resp.thread.started_date_mysql;
				var next_message_date = resp.next_messages_timestamp;
				var index = 0;

				_.each(
					resp.messages,
					function( value ) {
						if ( _.isNull( value ) ) {
							return;
						}

						index++;

						if (
							bp.Nouveau.Messages.previous != '' &&
							bp.Nouveau.Messages.previous.sent_split_date != value.sent_split_date &&
							$.inArray( bp.Nouveau.Messages.previous.sent_split_date, bp.Nouveau.Messages.divider ) === -1
						) {
							dividerMessageObject = bp.Nouveau.Messages.messages.createSpliter( value );
							bp.Nouveau.Messages.divider.push( bp.Nouveau.Messages.previous.sent_split_date );
							finalMessagesArray.push( dividerMessageObject );
						}
						finalMessagesArray.push( value );
						bp.Nouveau.Messages.previous = value;
						if (
							thread_start_date == next_message_date &&
							resp.messages.length === index &&
							$.inArray( value.sent_split_date, bp.Nouveau.Messages.divider ) === -1
						) {
							dividerMessageObject = bp.Nouveau.Messages.messages.createSpliter( value );
							dividerMessageObject.id = value.sent_split_date;
							dividerMessageObject.content = value.sent_date;
							bp.Nouveau.Messages.divider.push( value.sent_split_date );
							finalMessagesArray.push( dividerMessageObject );
						}
					}
				);

				setTimeout(
					function () { // Waiting to load dummy image.
						bp.Nouveau.reportPopUp();
					},
					1000
				);
				return finalMessagesArray;
			},

			createSpliter: function( value ) {
				var dividerObject = jQuery.extend( true, {}, value );

				dividerObject.id = bp.Nouveau.Messages.previous.sent_split_date;
				dividerObject.content = bp.Nouveau.Messages.previous.sent_date;
				dividerObject.sender_avatar = '';
				dividerObject.sender_id = '';
				dividerObject.sender_is_you = '';
				dividerObject.sender_link = '';
				dividerObject.sender_name = '';
				dividerObject.display_date = '';
				dividerObject.group_text = '';
				dividerObject.group_name = '';
				dividerObject.group_avatar = '';
				dividerObject.group_link = '';
				dividerObject.message_from = '';
				dividerObject.class_name = 'divider-date';

				if ( typeof dividerObject.gif !== 'undefined' ) {
					delete dividerObject.gif;
				}

				if ( typeof dividerObject.video !== 'undefined' ) {
					delete dividerObject.video;
				}

				if ( typeof dividerObject.document !== 'undefined' ) {
					delete dividerObject.document;
				}

				if ( typeof dividerObject.media !== 'undefined' ) {
					delete dividerObject.media;
				}

				return dividerObject;
			}
		}
	);

	bp.Models.GifResults = Backbone.Model.extend(
		{
			defaults: {
				q: '',
				data: []
			}
		}
	);

	bp.Models.GifData = Backbone.Model.extend( {} );

	// Git results collection returned from giphy api.
	bp.Collections.GifDatas = Backbone.Collection.extend(
		{
			// Reference to this collection's model.
			model: bp.Models.GifData
		}
	);

	// Extend wp.Backbone.View with .prepare() and .inject().
	bp.Nouveau.Messages.View = bp.Backbone.View.extend(
		{
			inject: function( selector ) {
				this.render();
				$( selector ).html( this.el );
				this.views.ready();
			},

			prepare: function() {
				if ( ! _.isUndefined( this.model ) && _.isFunction( this.model.toJSON ) ) {
					return this.model.toJSON();
				} else {
					return {};
				}
			}
		}
	);

	// Feedback view.
	bp.Views.Feedback = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'bp-messages bp-user-messages-feedback',
			template  : bp.template( 'bp-messages-feedback' ),

			initialize: function() {
				this.model = new Backbone.Model(
					{
						type: this.options.type || 'info',
						message: this.options.value
					}
				);
			}
		}
	);

	// Loading view.
	bp.Views.MessagesLoading = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'bp-messages bp-user-messages-loading loading',
			template  : bp.template( 'bp-messages-loading' )
		}
	);

	// Hook view.
	bp.Views.Hook = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			template  : bp.template( 'bp-messages-hook' ),

			initialize: function() {
				this.model = new Backbone.Model(
					{
						extraContent: this.options.extraContent
					}
				);

				this.el.className = 'bp-messages-hook';

				if ( this.options.className ) {
					this.el.className += ' ' + this.options.className;
				}
			}
		}
	);

	bp.Views.messageEditor = bp.Nouveau.Messages.View.extend(
		{
			template  : bp.template( 'bp-messages-editor' ),
			events: {
				'input #message_content': 'focusEditorOnChange',
				'input #message_content': 'postValidate',// jshint ignore:line
				'change .medium-editor-toolbar-input': 'mediumLink',
				'paste': 'handlePaste',
			},

			focusEditorOnChange: function ( e ) { // Fix issue of Editor loose focus when formatting is opened after selecting text.
				var medium_editor_toolbar = $( e.currentTarget ).closest( '#bp-message-content' ).find( '.medium-editor-toolbar' );
				setTimeout(
					function(){
						medium_editor_toolbar.addClass( 'medium-editor-toolbar-active' );
						$( e.currentTarget ).closest( '.bp-message-content-wrap' ).find( '#bp-message-content #message_content' ).focus();
					},
					0
				);
			},

			postValidate: function() {

				if( window.messageUploaderInProgress ) {
					return;
				}

				// Enable submit button if content is available
				var $message_content = this.$el.find( '#message_content' );
				var content = $.trim( $message_content[0].innerHTML.replace( /<div>/gi, '\n' ).replace( /<\/div>/gi, '' ) );
				content = content.replace( /&nbsp;/g, ' ' );

				if ( $( $.parseHTML( content ) ).text().trim() !== '' || ( ! _.isUndefined( this.views.parent.model.get( 'video' ) ) && 0 !== this.views.parent.model.get('video').length ) || ( ! _.isUndefined( this.views.parent.model.get( 'document' ) ) && 0 !== this.views.parent.model.get('document').length ) || ( ! _.isUndefined( this.views.parent.model.get( 'media' ) ) && 0 !== this.views.parent.model.get('media').length ) || ( ! _.isUndefined( this.views.parent.model.get( 'gif_data' ) ) && ! _.isEmpty( this.views.parent.model.get( 'gif_data' ) ) ) ) {
					this.$el.closest( '#bp-message-content' ).addClass( 'focus-in--content' );
				} else {
					this.$el.closest( '#bp-message-content' ).removeClass( 'focus-in--content' );
				}
			},

			DisableSubmit: function () {
				window.messageUploaderInProgress = true;
				this.$el.closest( '#bp-message-content' ).removeClass( 'focus-in--content' );
			},

			EnableSubmit: function () {
				window.messageUploaderInProgress = false;
				this.postValidate();
			},

			mediumLink: function () {
				var value = $( '.medium-editor-toolbar-input' ).val();

				if ( value !== '' ) {
					$( '#bp-message-content' ).addClass( 'focus-in--content' );
				}
			},

			handlePaste: function ( event ) {
				// Get user's pasted data.
				var clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData,
					data = clipboardData.getData( 'text/plain' );

				// Insert the filtered content.
				document.execCommand( 'insertHTML', false, data );

				// Prevent the standard paste behavior.
				event.preventDefault();
			},

			initialize: function() {
				this.on( 'ready', this.activateTinyMce, this );
				this.on( 'ready', this.listenToUploader, this );
				this.listenTo(Backbone, 'triggerMediaChange', this.postValidate);
				this.listenTo(Backbone, 'triggerMediaInProgress', this.DisableSubmit);
				this.listenTo(Backbone, 'triggerMediaComplete', this.EnableSubmit);
			},

			activateTinyMce: function() {
				if ( ! _.isUndefined( window.MediumEditor ) ) {

					bp.Nouveau.Messages.mediumEditor = new window.MediumEditor(
						'#message_content',
						{
							placeholder: {
								text: BP_Nouveau.messages.type_message,
								hideOnClick: true
							},
							toolbar: {
								buttons: ['bold', 'italic', 'unorderedlist','orderedlist', 'quote', 'anchor', 'pre' ],
								relativeContainer: document.getElementById( 'whats-new-messages-toolbar' ),
								static: true,
								updateOnEmptySelection: true
							},
							paste: {
								forcePlainText: false,
								cleanPastedHTML: true,
								cleanReplacements: [
									[new RegExp( /<div/gi ), '<p'],
									[new RegExp( /<\/div/gi ), '</p'],
									[new RegExp( /<h[1-6]/gi ), '<b'],
									[new RegExp( /<\/h[1-6]/gi ), '</b'],
								],
								cleanAttrs: ['class', 'style', 'dir', 'id'],
								cleanTags: [ 'meta', 'div', 'main', 'section', 'article', 'aside', 'button', 'svg', 'canvas', 'figure', 'input', 'textarea', 'select', 'label', 'form', 'table', 'thead', 'tfooter', 'colgroup', 'col', 'tr', 'td', 'th', 'dl', 'dd', 'center', 'caption', 'nav', 'img' ],
								unwrapTags: []
							},
							imageDragging: false,
							anchor: {
								linkValidation: true
							}
						}
					);

					bp.Nouveau.Messages.mediumEditor.subscribe( 'editableKeypress', function ( event ) {
						if ( event.keyCode === 13 && ! event.shiftKey ) {
							event.preventDefault();

							var content = bp.Nouveau.Messages.mediumEditor.getContent();
							// Add valid line breaks.
							content = $.trim( content.replace( /<div>/gi, '\n' ).replace( /<\/div>/gi, '' ) );
							content = content.replace( /&nbsp;/g, ' ' );
							if ( content ) {
								jQuery( document ).find( '#send_reply_button' ).trigger( 'click' );
							}
						}
					} );

					$( document ).on( 'keyup', '.bp-messages-content .medium-editor-toolbar-input', function ( event ) {

						var URL = event.target.value;

						if ( bp.Nouveau.isURL( URL ) ) {
							$( event.target ).removeClass( 'isNotValid' ).addClass( 'isValid' );
						} else {
							$( event.target ).removeClass( 'isValid' ).addClass( 'isNotValid' );
						}
					} );

					if ( ! _.isUndefined( BP_Nouveau.media ) &&
						! _.isUndefined( BP_Nouveau.media.emoji ) &&
						(
							(
								! _.isUndefined( BP_Nouveau.media.emoji.messages ) &&
								BP_Nouveau.media.emoji.messages
							) ||
							(
								! _.isUndefined( BP_Nouveau.media.emoji.groups ) &&
								BP_Nouveau.media.emoji.groups
							)
						)
					) {
						$( '#message_content' ).emojioneArea(
							{
								standalone: true,
								hideSource: false,
								container: $( '#whats-new-formatting-toolbar > .post-emoji' ),
								autocomplete: false,
								pickerPosition: 'bottom',
								hidePickerOnBlur: true,
								useInternalCDN: false,
								events: {
									emojibtn_click: function () {
										$( '#message_content' )[0].emojioneArea.hidePicker();
										bp.Nouveau.Messages.mediumEditor.checkContentChanged();

										// Enable submit button
										$( '#bp-message-content' ).addClass( 'focus-in--content' );
									},

									picker_show: function () {
										$( this.button[0] ).closest( '.post-emoji' ).addClass('active');
									},

									picker_hide: function () {
										$( this.button[0] ).closest( '.post-emoji' ).removeClass('active');
									},
								}
							}
						);
					}

					// check for mentions in the url, if set any then focus to editor.
					var mention = bp.Nouveau.getLinkParams( null, 'r' ) || null;

					// Check for mention.
					if ( ! _.isNull( mention ) ) {
						$( '#message_content' ).focus();
					}

				} else if ( typeof tinymce !== 'undefined' ) {
					tinymce.EditorManager.execCommand( 'mceAddEditor', true, 'message_content' );
				}
			}
		}
	);

	// Messages Media.
	bp.Views.MessagesMedia = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'messages-media-container',
			template: bp.template( 'messages-media' ),
			media : [],

			initialize: function () {
				this.model.set( 'media', this.media );
				document.addEventListener( 'messages_media_toggle', this.toggle_media_uploader.bind( this ) );
				document.addEventListener( 'messages_media_close', this.destroy.bind( this ) );
			},

			toggle_media_uploader: function() {
				var self = this;
				if ( self.$el.find( '#messages-post-media-uploader' ).hasClass( 'open' ) ) {
					self.destroy();
				} else {
					self.open_media_uploader();
				}
			},

			destroy: function() {
				var self = this;
				if ( ! _.isNull( bp.Nouveau.Messages.dropzone ) ) {
					bp.Nouveau.Messages.dropzone.destroy();
					self.$el.find( '#messages-post-media-uploader' ).html( '' );
				}
				self.media = [];
				self.model.set( 'media', self.media );
				self.$el.find( '#messages-post-media-uploader' ).removeClass( 'open' ).addClass( 'closed' );

				document.removeEventListener( 'messages_media_toggle', this.toggle_media_uploader.bind( this ) );
				document.removeEventListener( 'messages_media_close', this.destroy.bind( this ) );

				$( '#whats-new-messages-attachments' ).addClass( 'empty' );
			},

			open_media_uploader: function() {
				var self = this;
				
				var total_uploaded_file = 0;

				if ( self.$el.find( '#messages-post-media-uploader' ).hasClass( 'open' ) ) {
					return false;
				}
				self.destroy();

				var messageMediaTemplate                             = document.getElementsByClassName( 'message-post-media-template' ).length ? document.getElementsByClassName( 'message-post-media-template' )[0].innerHTML : ''; // Check to avoid error if Node is missing.
				bp.Nouveau.Messages.dropzone_options.previewTemplate = messageMediaTemplate;

				bp.Nouveau.Messages.dropzone = new window.Dropzone( '#messages-post-media-uploader', bp.Nouveau.Messages.dropzone_options );

				bp.Nouveau.Messages.dropzone.on(
					'addedfile',
					function ( file ) {
						total_uploaded_file++;
					}
				);
				
				bp.Nouveau.Messages.dropzone.on(
					'sending',
					function(file, xhr, formData) {
						formData.append( 'action', 'media_upload' );
						formData.append( '_wpnonce', BP_Nouveau.nonces.media );

						var tool_box = self.$el.parents( '#bp-message-content' );
						if ( tool_box.find( '#messages-document-button' ) ) {
							tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-video-button' ) ) {
							tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-gif-button' ) ) {
							tool_box.find( '#messages-gif-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-media-button' ) ) {
							tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).addClass( 'no-click' ).find( '.toolbar-button' ).addClass( 'active' );
						}
						this.element.classList.remove( 'files-uploaded' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'uploadprogress',
					function() {
						if ( bp.Nouveau.dropZoneGlobalProgress ) {
							bp.Nouveau.dropZoneGlobalProgress( this );
						}
						Backbone.trigger( 'triggerMediaInProgress' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'success',
					function(file, response) {
						if ( response.data.id ) {
							file.id 				 = response.data.id;
							response.data.uuid 		 = file.upload.uuid;
							response.data.menu_order = $( file.previewElement ).closest( '.dropzone' ).find( file.previewElement ).index() - 1;
							response.data.saved 	 = false;
							response.data.privacy 	 = 'message';
							response.data.js_preview = $( file.previewElement ).find( '.dz-image img' ).attr( 'src' );
							self.media.push( response.data );
							self.model.set( 'media', self.media );
							if ( total_uploaded_file <= BP_Nouveau.media.maxFiles ) {
								bp.Nouveau.Messages.removeFeedback();
							}
						} else {
							// if ( ! jQuery( '.message-media-error-popup' ).length) {
							// 	$( 'body' ).append( '<div id="bp-media-create-folder" style="display: block;" class="open-popup message-media-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response.data.feedback + '</p></div></div></div></div></transition></div>' );
							// }
							bp.Nouveau.Messages.displaySendMessageFeedback( BP_Nouveau.media.invalid_media_type + '</br>' + response.data.feedback, 'error' );
							this.removeFile( file );
							if ( ! _.isNull( bp.Nouveau.Messages.dropzone.files ) && bp.Nouveau.Messages.dropzone.files.length === 0 ) {
								self.$el.children( '.dropzone' ).removeClass( 'files-uploaded dz-progress-view' ).find( '.dz-global-progress' ).remove();
							}
						}
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'error',
					function(file,response) {
						var errorText = '';
						if ( file.accepted ) {
							if ( typeof response !== 'undefined' && typeof response.data !== 'undefined' && typeof response.data.feedback !== 'undefined' ) {
								errorText = response.data.feedback;
							} else if ( 'Server responded with 0 code.' == response ) { // update error text to user friendly.
								errorText = BP_Nouveau.media.connection_lost_error;
							}
						} else {
							// if ( ! jQuery( '.message-media-error-popup' ).length) {
							// 	$( 'body' ).append( '<div id="bp-media-create-folder" style="display: block;" class="open-popup message-media-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							// }
							errorText = BP_Nouveau.media.invalid_media_type + '</br>' + response;
						}
						bp.Nouveau.Messages.displaySendMessageFeedback( errorText, 'error' );
						this.removeFile( file );
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'removedfile',
					function(file) {
						if ( self.media.length ) {
							for ( var i in self.media ) {
								if ( file.id === self.media[i].id ) {
									if ( typeof self.media[i].saved !== 'undefined' && ! self.media[i].saved ) {
										bp.Nouveau.Media.removeAttachment( file.id );
									}
									self.media.splice( i, 1 );
									self.model.set( 'media', self.media );
								}
							}
							if ( 'error' !== file.status ) {
								bp.Nouveau.Messages.removeFeedback();
							}
						}

						if ( ! _.isNull( bp.Nouveau.Messages.dropzone.files ) && bp.Nouveau.Messages.dropzone.files.length === 0 ) {
							var tool_box = self.$el.parents( '#bp-message-content' );
							if ( tool_box.find( '#messages-document-button' ) ) {
								tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-video-button' ) ) {
								tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-gif-button' ) ) {
								tool_box.find( '#messages-gif-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-media-button' ) ) {
								tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'no-click' ).find( '.toolbar-button' ).removeClass( 'active' );
							}
							self.$el.children( '.dropzone' ).removeClass( 'files-uploaded dz-progress-view' ).find( '.dz-global-progress' ).remove();
						}
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				// Show add more button when all files are uploaded
				bp.Nouveau.Messages.dropzone.on(
					'complete',
					function() {
						if ( this.getUploadingFiles().length === 0 && this.getQueuedFiles().length === 0 && this.files.length > 0 ) {
							this.element.classList.add( 'files-uploaded' );
							Backbone.trigger( 'triggerMediaComplete' );
							total_uploaded_file = self.media.length;
						}
					}
				);

				// self.$el.find( '#messages-post-media-uploader' ).addClass( 'open' ).removeClass( 'closed' );
				$( '#whats-new-messages-attachments' ).addClass( 'empty' );
			}

		}
	);

	// Messages Document.
	bp.Views.MessagesDocument = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'messages-document-container',
			template: bp.template( 'messages-document' ),
			document : [],

			initialize: function () {
				this.model.set( 'document', this.document );
				document.addEventListener( 'messages_document_toggle', this.toggle_document_uploader.bind( this ) );
				document.addEventListener( 'messages_document_close', this.destroy.bind( this ) );
			},

			toggle_document_uploader: function() {
				var self = this;
				if ( self.$el.find( '#messages-post-document-uploader' ).hasClass( 'open' ) ) {
					self.destroy();
				} else {
					self.open_document_uploader();
				}
			},

			destroy: function() {
				var self = this;
				if ( ! _.isNull( bp.Nouveau.Messages.dropzone ) ) {
					bp.Nouveau.Messages.dropzone.destroy();
					self.$el.find( '#messages-post-document-uploader' ).html( '' );
				}
				self.document = [];
				self.model.set( 'document', self.document );
				self.$el.find( '#messages-post-document-uploader' ).removeClass( 'open' ).addClass( 'closed' );

				document.removeEventListener( 'messages_document_toggle', this.toggle_document_uploader.bind( this ) );
				document.removeEventListener( 'messages_document_close', this.destroy.bind( this ) );

				$( '#whats-new-messages-attachments' ).addClass( 'empty' );
			},

			open_document_uploader: function() {
				var self = this;

				if ( self.$el.find( '#messages-post-document-uploader' ).hasClass( 'open' ) ) {
					return false;
				}
				self.destroy();

				var messageDocumentTemplate                                   = document.getElementsByClassName( 'message-post-document-template' ).length ? document.getElementsByClassName( 'message-post-document-template' )[0].innerHTML : ''; // Check to avoid error if Node is missing.
				bp.Nouveau.Messages.dropzone_document_options.previewTemplate = messageDocumentTemplate;

				bp.Nouveau.Messages.dropzone = new window.Dropzone( '#messages-post-document-uploader', bp.Nouveau.Messages.dropzone_document_options );

				bp.Nouveau.Messages.dropzone.on(
					'addedfile',
					function ( file ) {
						var filename = file.upload.filename;
						var fileExtension = filename.substr( ( filename.lastIndexOf( '.' ) + 1 ) );
						$( file.previewElement ).find( '.dz-details .dz-icon .bb-icon-file').removeClass( 'bb-icon-file' ).addClass( 'bb-icon-file-' + fileExtension );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'sending',
					function(file, xhr, formData) {
						formData.append( 'action', 'document_document_upload' );
						formData.append( '_wpnonce', BP_Nouveau.nonces.media );

						var tool_box = self.$el.parents( '#bp-message-content' );
						if ( tool_box.find( '#messages-media-button' ) ) {
							tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-video-button' ) ) {
							tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-gif-button' ) ) {
							tool_box.find( '#messages-gif-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-document-button' ) ) {
							tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).addClass( 'no-click' ).find( '.toolbar-button' ).addClass( 'active' );
						}
						this.element.classList.remove( 'files-uploaded' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'success',
					function(file, response) {
						if ( response.data.id ) {
							file.id 				 = response.data.id;
							response.data.uuid 		 = file.upload.uuid;
							response.data.menu_order = $( file.previewElement ).closest( '.dropzone' ).find( file.previewElement ).index() - 1;
							response.data.saved 	 = false;
							response.data.privacy 	 = 'message';
							self.document.push( response.data );
							self.model.set( 'document', self.document );
							bp.Nouveau.Messages.removeFeedback();
							return file.previewElement.classList.add( 'dz-success' );
						} else {
							var message = response.data.feedback;
							bp.Nouveau.Messages.displaySendMessageFeedback( message, 'error' );
							this.removeFile( file );
							if ( ! _.isNull( bp.Nouveau.Messages.dropzone.files ) && bp.Nouveau.Messages.dropzone.files.length === 0 ) {
								self.$el.children( '.dropzone' ).removeClass( 'files-uploaded dz-progress-view' ).find( '.dz-global-progress' ).remove();
							}
						}
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'uploadprogress',
					function() {
						if ( bp.Nouveau.dropZoneGlobalProgress ) {
							bp.Nouveau.dropZoneGlobalProgress( this );
						}
						Backbone.trigger( 'triggerMediaInProgress' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'accept',
					function( file, done ) {
						bp.Nouveau.Messages.removeFeedback();
						if (file.size == 0) {
							done( BP_Nouveau.media.empty_document_type );
						} else {
							done();
						}
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'error',
					function(file,response) {
						var errorText = '';
						if ( file.accepted ) {
							if ( typeof response !== 'undefined' && typeof response.data !== 'undefined' && typeof response.data.feedback !== 'undefined' ) {
								errorText = response.data.feedback;
							} else if( 'Server responded with 0 code.' == response ) { // update error text to user friendly
								errorText = BP_Nouveau.media.connection_lost_error;
							}
						} else {
							// if ( ! jQuery( '.document-error-popup' ).length) {
							// 	$( 'body' ).append( '<div id="bp-media-create-folder" style="display: block;" class="open-popup document-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_file_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							// }
							errorText =  BP_Nouveau.media.invalid_file_type + '</br>' + response;
						}
						bp.Nouveau.Messages.displaySendMessageFeedback( errorText, 'error' );
						this.removeFile( file );
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'removedfile',
					function(file) {
						if ( self.document.length ) {
							for ( var i in self.document ) {
								if ( file.id === self.document[i].id ) {
									if ( typeof self.document[i].saved !== 'undefined' && ! self.document[i].saved ) {
										bp.Nouveau.Media.removeAttachment( file.id );
									}
									self.document.splice( i, 1 );
									self.model.set( 'document', self.document );
								}
							}
						}

						if ( ! _.isNull( bp.Nouveau.Messages.dropzone.files ) && bp.Nouveau.Messages.dropzone.files.length === 0 ) {
							var tool_box = self.$el.parents( '#bp-message-content' );
							if ( tool_box.find( '#messages-media-button' ) ) {
								tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-video-button' ) ) {
								tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-gif-button' ) ) {
								tool_box.find( '#messages-gif-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-document-button' ) ) {
								tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'no-click' ).find( '.toolbar-button' ).removeClass( 'active' );
							}
							self.$el.children( '.dropzone' ).removeClass( 'files-uploaded dz-progress-view' ).find( '.dz-global-progress' ).remove();
						}
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				// Show add more button when all files are uploaded
				bp.Nouveau.Messages.dropzone.on(
					'complete',
					function() {
						if ( this.getUploadingFiles().length === 0 && this.getQueuedFiles().length === 0 && this.files.length > 0 ) {
							this.element.classList.add( 'files-uploaded' );
							Backbone.trigger( 'triggerMediaComplete' );
						}
					}
				);

				// self.$el.find( '#messages-post-document-uploader' ).addClass( 'open' ).removeClass( 'closed' );
				$( '#whats-new-messages-attachments' ).addClass( 'empty' );
			}

		}
	);

	// Message Video Selector.
	bp.Views.MessagesVideo = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'messages-video-container',
			template: bp.template( 'messages-video' ),
			video : [],

			initialize: function () {
				this.model.set( 'video', this.video );
				document.addEventListener( 'messages_video_toggle', this.toggle_video_uploader.bind( this ) );
				document.addEventListener( 'messages_video_close', this.destroy.bind( this ) );
			},

			toggle_video_uploader: function() {
				var self = this;
				if ( self.$el.find( '#messages-post-video-uploader' ).hasClass( 'open' ) ) {
					self.destroy();
				} else {
					self.open_video_uploader();
				}
			},

			destroy: function() {
				var self = this;
				if ( ! _.isNull( bp.Nouveau.Messages.dropzone ) ) {
					bp.Nouveau.Messages.dropzone.destroy();
					self.$el.find( '#messages-post-video-uploader' ).html( '' );
				}
				self.video = [];
				self.model.set( 'video', self.video );
				self.$el.find( '#messages-post-video-uploader' ).removeClass( 'open' ).addClass( 'closed' );

				document.removeEventListener( 'messages_video_toggle', this.toggle_video_uploader.bind( this ) );
				document.removeEventListener( 'messages_video_close', this.destroy.bind( this ) );

				$( '#whats-new-messages-attachments' ).addClass( 'empty' );
			},

			open_video_uploader: function() {
				var self = this;

				if ( self.$el.find( '#messages-post-video-uploader' ).hasClass( 'open' ) ) {
					return false;
				}
				self.destroy();

				var messageVideoTemplate                                   = document.getElementsByClassName( 'message-post-video-template' ).length ? document.getElementsByClassName( 'message-post-video-template' )[0].innerHTML : ''; // Check to avoid error if Node is missing.
				bp.Nouveau.Messages.dropzone_video_options.previewTemplate = messageVideoTemplate;

				bp.Nouveau.Messages.dropzone = new window.Dropzone( '#messages-post-video-uploader', bp.Nouveau.Messages.dropzone_video_options );

				bp.Nouveau.Messages.dropzone.on(
					'sending',
					function(file, xhr, formData) {
						formData.append( 'action', 'video_upload' );
						formData.append( '_wpnonce', BP_Nouveau.nonces.video );

						var tool_box = self.$el.parents( '#bp-message-content' );
						if ( tool_box.find( '#messages-document-button' ) ) {
							tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-gif-button' ) ) {
							tool_box.find( '#messages-gif-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-media-button' ) ) {
							tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
						}
						if ( tool_box.find( '#messages-video-button' ) ) {
							tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).addClass( 'no-click' ).find( '.toolbar-button' ).addClass( 'active' );
						}
						this.element.classList.remove( 'files-uploaded' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'addedfile',
					function ( file ) {

						if (file.dataURL) {
							// Get Thumbnail image from response.
						} else {

							if ( bp.Nouveau.getVideoThumb ) {
								bp.Nouveau.getVideoThumb( file, '.dz-video-thumbnail' );
							}

						}
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'uploadprogress',
					function() {
						if ( bp.Nouveau.dropZoneGlobalProgress ) {
							bp.Nouveau.dropZoneGlobalProgress( this );
						}
						Backbone.trigger( 'triggerMediaInProgress' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'success',
					function(file, response) {

						if ( file.upload.progress === 100 ) {
							$( file.previewElement ).find( '.dz-progress-ring circle' )[0].style.strokeDashoffset = 0;
							$( file.previewElement ).find( '.dz-progress-count' ).text( '100% ' + BP_Nouveau.video.i18n_strings.video_uploaded_text );
							$( file.previewElement ).closest( '.dz-preview' ).addClass( 'dz-complete' );
						}

						if ( response.data.id ) {
							file.id 				 = response.data.id;
							response.data.uuid 		 = file.upload.uuid;
							response.data.menu_order = $( file.previewElement ).closest( '.dropzone' ).find( file.previewElement ).index() - 1;
							response.data.saved 	 = false;
							response.data.privacy 	 = 'message';
							response.data.js_preview = $( file.previewElement ).find( '.dz-video-thumbnail img' ).attr( 'src' );
							self.video.push( response.data );
							self.model.set( 'video', self.video );
							bp.Nouveau.Messages.removeFeedback();
						} else {
							var message = response.data.feedback;
							bp.Nouveau.Messages.displaySendMessageFeedback( message, 'error' );
							this.removeFile( file );
							if ( ! _.isNull( bp.Nouveau.Messages.dropzone.files ) && bp.Nouveau.Messages.dropzone.files.length === 0 ) {
								self.$el.children( '.dropzone' ).removeClass( 'files-uploaded dz-progress-view' ).find( '.dz-global-progress' ).remove();
							}
						}
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'accept',
					function( file, done ) {
						bp.Nouveau.Messages.removeFeedback();
						if (file.size == 0) {
							done( BP_Nouveau.media.empty_video_type );
						} else {
							done();
						}
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'error',
					function(file,response) {
						var errorText = '';
						if ( file.accepted ) {
							if ( typeof response !== 'undefined' && typeof response.data !== 'undefined' && typeof response.data.feedback !== 'undefined' ) {
								errorText = response.data.feedback;
							} else if( 'Server responded with 0 code.' == response ) { // update error text to user friendly
								errorText = BP_Nouveau.media.connection_lost_error;
							}
						} else {
							// $( 'body' ).append( '<div id="bp-video-create-album" style="display: block;" class="open-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-video-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button closeModalErrorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							errorText = BP_Nouveau.media.invalid_media_type + '</br>' + response;
						}
						bp.Nouveau.Messages.displaySendMessageFeedback( errorText, 'error' );
						this.removeFile( file );
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				bp.Nouveau.Messages.dropzone.on(
					'removedfile',
					function(file) {
						if ( self.video.length ) {
							for ( var i in self.video ) {
								if ( file.id === self.video[i].id ) {
									if ( typeof self.video[i].saved !== 'undefined' && ! self.video[i].saved ) {
										bp.Nouveau.Media.removeAttachment( file.id );
									}
									self.video.splice( i, 1 );
									self.model.set( 'video', self.video );
								}
							}
						}

						if ( ! _.isNull( bp.Nouveau.Messages.dropzone.files ) && bp.Nouveau.Messages.dropzone.files.length === 0 ) {
							var tool_box = self.$el.parents( '#bp-message-content' );
							if ( tool_box.find( '#messages-document-button' ) ) {
								tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-gif-button' ) ) {
								tool_box.find( '#messages-gif-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-media-button' ) ) {
								tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
							}
							if ( tool_box.find( '#messages-video-button' ) ) {
								tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'no-click' ).find( '.toolbar-button' ).removeClass( 'active' );
							}
							self.$el.children( '.dropzone' ).removeClass( 'files-uploaded dz-progress-view' ).find( '.dz-global-progress' ).remove();
						}
						Backbone.trigger( 'triggerMediaChange' );
					}
				);

				// Show add more button when all files are uploaded
				bp.Nouveau.Messages.dropzone.on(
					'complete',
					function() {
						if ( this.getUploadingFiles().length === 0 && this.getQueuedFiles().length === 0 && this.files.length > 0 ) {
							this.element.classList.add( 'files-uploaded' );
							Backbone.trigger( 'triggerMediaComplete' );
						}
					}
				);

				// self.$el.find( '#messages-post-video-uploader' ).addClass( 'open' ).removeClass( 'closed' );
				$( '#whats-new-messages-attachments' ).addClass( 'empty' );
			}

		}
	);

	// Activity gif selector.
	bp.Views.MessagesAttachedGifPreview = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'messages-attached-gif-container',
			template: bp.template( 'messages-attached-gif' ),
			events: {
				'click .gif-image-remove': 'destroy'
			},

			initialize: function() {
				this.model.set( 'gif_data', {} );
				this.listenTo( this.model, 'change', this.render );
				document.addEventListener( 'messages_gif_close', this.destroy.bind( this ) );
			},

			render: function() {
				this.$el.html( this.template( this.model.toJSON() ) );

				var gifData = this.model.get( 'gif_data' );
				if ( ! _.isEmpty( gifData ) ) {
					this.el.style.backgroundImage = 'url(' + gifData.images.fixed_width.url + ')';
					this.el.style.backgroundSize  = 'contain';
					this.el.style.height 		  = gifData.images.original.height + 'px';
					this.el.style.width 		  = gifData.images.original.width + 'px';
					$( '#whats-new-messages-attachments' ).addClass( 'empty' );
				}

				return this;
			},

			destroy: function() {
				this.model.set( 'gif_data', {} );
				this.el.style.backgroundImage = '';
				this.el.style.backgroundSize  = '';
				this.el.style.height 		  = '0px';
				this.el.style.width 		  = '0px';
				document.removeEventListener( 'messages_gif_close', this.destroy.bind( this ) );
				$( '#whats-new-messages-attachments' ).addClass( 'empty' );

				var tool_box = this.$el.parents( '#bp-message-content' );
				if ( tool_box.find( '#messages-media-button' ) ) {
					tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
				}
				if ( tool_box.find( '#messages-document-button' ) ) {
					tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
				}
				if ( tool_box.find( '#messages-video-button' ) ) {
					tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).removeClass( 'disable' );
				}
				if ( tool_box.find( '#messages-gif-button' ) ) {
					tool_box.find( '#messages-gif-button' ).removeClass( 'open active' );
				}
				Backbone.trigger( 'triggerMediaChange' );
			}
		}
	);

	// Gif search dropdown.
	bp.Views.MessagesGifMediaSearchDropdown = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'messages-attached-gif-container',
			template: bp.template( 'messages-gif-media-search-dropdown' ),
			total_count: 0,
			offset: 0,
			limit: 20,
			q: null,
			requests: [],
			events: {
				'keyup .search-query-input': 'search',
				'click .found-media-item': 'select'
			},

			initialize: function( options ) {
				this.options = options || {};
				this.giphy   = new window.Giphy( BP_Nouveau.media.gif_api_key );

				this.gifDataItems = new bp.Collections.GifDatas();
				this.listenTo( this.gifDataItems, 'add', this.addOne );
				this.listenTo( this.gifDataItems, 'reset', this.addAll );

				document.addEventListener( 'scroll', _.bind( this.loadMore, this ), true );

			},

			render: function() {
				this.$el.html( this.template( this.model.toJSON() ) );
				this.$gifResultItem = this.$el.find( '.gif-search-results-list' );
				this.loadTrending();
				return this;
			},

			search: function( e ) {
				var self = this;

				if ( this.Timeout != null ) {
					clearTimeout( this.Timeout );
				}

				this.Timeout = setTimeout(
					function() {
						this.Timeout = null;
						self.searchGif( e.target.value );
					},
					1000
				);
			},

			searchGif: function( q ) {
				var self 	= this;
				self.q 		= q;
				self.offset = 0;

				self.clearRequests();
				self.el.classList.add( 'loading' );

				var request = self.giphy.search(
					{
						q: q,
						offset: self.offset,
						fmt: 'json',
						limit: this.limit
					},
					function( response ) {
						self.gifDataItems.reset( response.data );
						self.total_count = response.pagination.total_count;
						self.el.classList.remove( 'loading' );
					}
				);

				self.requests.push( request );
				self.offset = self.offset + self.limit;
			},

			select: function( e ) {
				e.preventDefault();
				this.$el.parent().removeClass( 'open' );
				var model = this.gifDataItems.findWhere( {id: e.currentTarget.dataset.id} );
				this.model.set( 'gif_data', model.attributes );
				Backbone.trigger( 'triggerMediaChange' );

				var tool_box = this.$el.parents( '#bp-message-content' );
				if ( tool_box.find( '#messages-media-button' ) ) {
					tool_box.find( '#messages-media-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
				}
				if ( tool_box.find( '#messages-document-button' ) ) {
					tool_box.find( '#messages-document-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
				}
				if ( tool_box.find( '#messages-video-button' ) ) {
					tool_box.find( '#messages-video-button' ).parents( '.post-elements-buttons-item' ).addClass( 'disable' );
				}
			},

			// Add a single GifDataItem to the list by creating a view for it, and
			// appending its element to the `<ul>`.
			addOne: function( data ) {
				var view = new bp.Views.MessagesGifDataItem( { model: data } );
				this.$gifResultItem.append( view.render().el );
			},

			// Add all items in the **GifDataItem** collection at once.
			addAll: function() {
				this.$gifResultItem.html( '' );
				this.gifDataItems.each( this.addOne, this );
			},

			loadTrending: function() {
				var self 	= this;
				self.offset = 0;
				self.q 		= null;

				self.clearRequests();
				self.el.classList.add( 'loading' );

				var request = self.giphy.trending(
					{
						offset: self.offset,
						fmt: 'json',
						limit: this.limit
					},
					function( response ) {
						self.gifDataItems.reset( response.data );
						self.total_count = response.pagination.total_count;
						self.el.classList.remove( 'loading' );
					}
				);

				self.requests.push( request );
				self.offset = self.offset + self.limit;
			},

			loadMore: function( event ) {
				if ( event.target.id === 'gif-search-results' ) { // or any other filtering condition.
					var el = event.target;
					if ( el.scrollTop + el.offsetHeight >= el.scrollHeight && ! el.classList.contains( 'loading' ) ) {
						if ( this.total_count > 0 && this.offset <= this.total_count ) {
							var self   = this,
								params = {
									offset: self.offset,
									fmt: 'json',
									limit: self.limit
								};

							self.el.classList.add( 'loading' );
							var request = null;
							if ( _.isNull( self.q ) ) {
								request = self.giphy.trending( params, _.bind( self.loadMoreResponse, self ) );
							} else {
								request = self.giphy.search( _.extend( { q: self.q }, params ), _.bind( self.loadMoreResponse, self ) );
							}

							self.requests.push( request );
							this.offset = this.offset + this.limit;
						}
					}
				}
			},

			clearRequests: function() {
				this.gifDataItems.reset();

				for ( var i = 0; i < this.requests.length; i++ ) {
					this.requests[i].abort();
				}

				this.requests = [];
			},

			loadMoreResponse: function( response ) {
				this.el.classList.remove( 'loading' );
				this.gifDataItems.add( response.data );
			}
		}
	);

	// Gif search dropdown single item.
	bp.Views.MessagesGifDataItem = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'li',
			template: bp.template( 'messages-gif-result-item' ),
			initialize: function() {
				this.listenTo( this.model, 'change', this.render );
				this.listenTo( this.model, 'destroy', this.remove );
			},

			render: function() {
				var bgNo   = Math.floor( Math.random() * (6 - 1 + 1) ) + 1,
					images = this.model.get( 'images' );

				this.$el.html( this.template( this.model.toJSON() ) );
				this.el.classList.add( 'bg' + bgNo );
				this.el.style.height = images.fixed_width.height + 'px';

				return this;
			}

		}
	);

	bp.Views.MessagesToolbar = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			id: 'whats-new-messages-toolbar',
			template: bp.template( 'whats-new-messages-toolbar' ),
			events: {
				'click #messages-media-button': 'toggleMediaSelector',
				'click #messages-document-button': 'toggleDocumentSelector',
				'click #messages-video-button': 'toggleVideoSelector',
				'click #messages-gif-button': 'toggleGifSelector',
				'click .medium-editor-toolbar-actions': 'focusEditor'
			},

			initialize: function() {
				document.addEventListener( 'keydown', _.bind( this.closePickersOnEsc, this ) );
				$( document ).on( 'click', _.bind( this.closePickersOnClick, this ) );
			},

			render: function() {
				this.$el.html( this.template( this.model.toJSON() ) );
				this.$self        = this.$el.find( '#messages-gif-button' );
				this.$gifPickerEl = this.$el.find( '.gif-media-search-dropdown' );
				return this;
			},

			toggleMediaSelector: function( e ) {
				e.preventDefault();
				this.closeGifSelector();
				this.closeDocumentSelector();
				this.closeVideoSelector();
				var event = new Event( 'messages_media_toggle' );
				document.dispatchEvent( event );
				$( '#messages-post-media-uploader' ).trigger( 'click' );
				// $( e.currentTarget ).toggleClass( 'active' );
			},

			toggleDocumentSelector: function( e ) {
				e.preventDefault();
				this.closeMediaSelector();
				this.closeGifSelector();
				this.closeVideoSelector();
				var documentEvent = new Event( 'messages_document_toggle' );
				document.dispatchEvent( documentEvent );
				$( '#messages-post-document-uploader' ).trigger( 'click' );
				// $( e.currentTarget ).toggleClass( 'active' );
			},

			toggleVideoSelector: function( e ) {
				e.preventDefault();
				this.closeGifSelector();
				this.closeMediaSelector();
				this.closeDocumentSelector();
				var event = new Event( 'messages_video_toggle' );
				document.dispatchEvent( event );
				$( '#messages-post-video-uploader' ).trigger( 'click' );
				// $( e.currentTarget ).toggleClass( 'active' );
			},

			closeMediaSelector: function() {
				var event = new Event( 'messages_media_close' );
				document.dispatchEvent( event );
				$( '#messages-media-button' ).removeClass( 'active' );
			},

			closeDocumentSelector: function() {
				var documentCloseEvent = new Event( 'messages_document_close' );
				document.dispatchEvent( documentCloseEvent );
				$( '#messages-document-button' ).removeClass( 'active' );
			},

			closeVideoSelector: function() {
				var videoCloseEvent = new Event( 'messages_video_close' );
				document.dispatchEvent( videoCloseEvent );
				$( '#messages-video-button' ).removeClass( 'active' );
			},

			toggleGifSelector: function( e ) {
				e.preventDefault();
				this.closeMediaSelector();
				this.closeDocumentSelector();
				this.closeVideoSelector();
				if ( this.$gifPickerEl.is( ':empty' ) ) {
					var gifMediaSearchDropdownView = new bp.Views.MessagesGifMediaSearchDropdown( {model: this.model} );
					this.$gifPickerEl.html( gifMediaSearchDropdownView.render().el );
				}
				var gif_box = $( e.currentTarget ).parents( '#bp-message-content' ).find( '#whats-new-messages-attachments .messages-attached-gif-container' );
				if ( this.$self.hasClass( 'open' ) && gif_box.length && $.trim( gif_box.html() ) == '' ) {
					this.$self.removeClass( 'open' );
					$( e.currentTarget ).removeClass( 'active' );
				} else {
					this.$self.addClass( 'open' );
					$( e.currentTarget ).addClass( 'active' );
				}
				this.$gifPickerEl.toggleClass( 'open' );
			},

			focusEditor: function ( e ) {
				if ( bp.Nouveau.Messages.mediumEditor.exportSelection() === null ) {
					$( e.currentTarget ).closest( '.bp-message-content-wrap' ).find( '#bp-message-content #message_content' ).focus();
				}
			},

			closeGifSelector: function() {
				var event = new Event( 'messages_gif_close' );
				document.dispatchEvent( event );
				$( '#messages-gif-button' ).removeClass( 'open active' );
			},

			closePickersOnEsc: function( event ) {
				if ( event.key === 'Escape' || event.keyCode === 27 ) {
					if ( ! _.isUndefined( BP_Nouveau.media ) && ! _.isUndefined( BP_Nouveau.media.gif_api_key )) {
						var gif_box = this.$self.parents( '#bp-message-content' ).find( '#whats-new-messages-attachments .messages-attached-gif-container' );
						if ( gif_box.length && $.trim( gif_box.html() ) == '' ) {
							this.$self.removeClass( 'open active' );
						}
						this.$gifPickerEl.removeClass( 'open' );
					}
				}
			},

			closePickersOnClick: function( event ) {
				var $targetEl = $( event.target );

				if ( ! _.isUndefined( BP_Nouveau.media ) && ! _.isUndefined( BP_Nouveau.media.gif_api_key ) &&
					! $targetEl.closest( '.post-gif' ).length) {

					var gif_box = this.$self.parents( '#bp-message-content' ).find( '#whats-new-messages-attachments .messages-attached-gif-container' );
					if ( gif_box.length > 0 && $.trim( gif_box.html() ) == '' ) {
						this.$self.removeClass( 'open active' );
					}
					this.$gifPickerEl.removeClass( 'open' );
				}
			}

		}
	);

	bp.Views.FormattingToolbar = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			id: 'whats-new-formatting-toolbar',
			template: bp.template( 'whats-new-formatting-toolbar' ),
			events: {
				'click #show-toolbar-button': 'toggleToolbarSelector',
			},

			render: function() {
				this.$el.html( this.template( this.model.toJSON() ) );
				return this;
			},

			toggleToolbarSelector: function( e ) {
				e.preventDefault();
				$( e.currentTarget ).toggleClass( 'active' );
				var medium_editor_toolbar = $( e.currentTarget ).closest( '#bp-message-content' ).find( '.medium-editor-toolbar' );
				if ( $( e.currentTarget ).hasClass( 'active' ) ) {
					$( e.currentTarget ).parent( '.show-toolbar' ).attr( 'data-bp-tooltip',jQuery( e.currentTarget ).parent( '.show-toolbar' ).attr( 'data-bp-tooltip-hide' ) );
					if ( bp.Nouveau.Messages.mediumEditor.exportSelection() != null ) {
						medium_editor_toolbar.addClass( 'medium-editor-toolbar-active' );
					}
				} else {
					$( e.currentTarget ).parent( '.show-toolbar' ).attr( 'data-bp-tooltip',jQuery( e.currentTarget ).parent( '.show-toolbar' ).attr( 'data-bp-tooltip-show' ) );
					if ( bp.Nouveau.Messages.mediumEditor.exportSelection() === null ) {
						medium_editor_toolbar.removeClass( 'medium-editor-toolbar-active' );
					}
				}

				$( bp.Nouveau.Messages.mediumEditor.elements[0] ).focus();
				medium_editor_toolbar.toggleClass( 'active' );

				var gif_box = $( e.currentTarget ).parents( '#bp-message-content' ).find( '#whats-new-messages-attachments .messages-attached-gif-container' );
				if ( gif_box.length && $.trim( gif_box.html() ) == '' ) {
					this.$self.removeClass( 'open active' );
				}
			}

		}
	);

	bp.Views.MessagesAttachments = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			id: 'whats-new-messages-attachments',
			className: 'attachments--small',
			messagesMedia: null,
			messagesDocument: null,
			messagesVideo: null,
			messagesAttachedGifPreview: null,
			initialize: function() {
				if ( ! _.isUndefined( window.Dropzone ) && ! _.isUndefined( BP_Nouveau.media ) && BP_Nouveau.media.messages_media_active ) {
					this.messagesMedia = new bp.Views.MessagesMedia( {model: this.model} );
					this.views.add( this.messagesMedia );
				}

				if ( ! _.isUndefined( window.Dropzone ) && ! _.isUndefined( BP_Nouveau.media ) && BP_Nouveau.media.messages_document_active ) {
					this.messagesDocument = new bp.Views.MessagesDocument( {model: this.model} );
					this.views.add( this.messagesDocument );
				}

				if ( ! _.isUndefined( window.Dropzone ) && ! _.isUndefined( BP_Nouveau.video ) && ( BP_Nouveau.video.messages_video_active ) ) {
					this.messagesVideo = new bp.Views.MessagesVideo( {model: this.model} );
					this.views.add( this.messagesVideo );
				}

				this.messagesAttachedGifPreview = new bp.Views.MessagesAttachedGifPreview( { model: this.model } );
				this.views.add( this.messagesAttachedGifPreview );
			},
			onClose: function() {
				if ( ! _.isNull( this.messagesMedia ) ) {
					this.messagesMedia.destroy();
				}
				if ( ! _.isNull( this.messagesDocument ) ) {
					this.messagesDocument.destroy();
				}
				if ( ! _.isNull( this.messagesVideo ) ) {
					this.messagesVideo.destroy();
				}
				if ( ! _.isNull( this.messagesAttachedGifPreview ) ) {
					this.messagesAttachedGifPreview.destroy();
				}
			}
		}
	);

	bp.Views.MessagesNoThreads = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'bb-messages-no-thread-found',
			template  : bp.template( 'bp-messages-no-threads' ),
			events: {
				'click #bp-new-message'  : 'openComposeMessage'
			},
			initialize: function() {
				this.$el.html( this.template() );
				return this;
			},
			openComposeMessage: function(e) {
				e.preventDefault();

				bp.Nouveau.Messages.router.navigate( 'compose/', { trigger: true } );
			}
		}
	);

	bp.Views.MessagesSearchNoThreads = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			className: 'bb-messages-search-no-thread-found',
			template  : bp.template( 'bp-messages-search-no-threads' ),
			events: {
				'click #bp-new-message'  : 'openComposeMessage'
			},
			initialize: function() {
				this.$el.html( this.template() );
				return this;
			},
			openComposeMessage: function(e) {
				e.preventDefault();

				bp.Nouveau.Messages.router.navigate( 'compose/', { trigger: true } );
			}
		}
	);

	bp.Views.MessageFormSubmit = bp.Nouveau.Messages.View.extend(
		{
			tagName   : 'div',
			className   : 'submit',
			id        : 'message-new-submit',
			template  : bp.template( 'bp-messages-form-submit' )
		}
	);

	bp.Views.MessageFormSubmitWrapper = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			id: 'message-form-submit-wrapper',
			initialize: function() {
				this.views.add( new bp.Views.MessagesToolbar( { model: this.model } ) );
				this.views.add( new bp.Views.FormattingToolbar( { model: this.model } ) );
				this.views.add( new bp.Views.MessageFormSubmit( { model: this.model } ) );
			}
		}
	);

	bp.Views.messageForm = bp.Nouveau.Messages.View.extend(
		{
			tagName   : 'form',
			id        : 'send_message_form',
			className : 'standard-form',
			template  : bp.template( 'bp-messages-form' ),
			messagesAttachments : false,

			events: {
				'click #bp-messages-send'  : 'sendMessage',
				'click #bp-messages-reset' : 'resetForm',
				'click .bp-close-compose-form' : 'closeComposeForm'
			},

			initialize: function() {
				// Clone the model to set the resetted one.
				this.resetModel = this.model.clone();

				// Add the editor view.
				this.views.add( '#bp-message-content', new bp.Views.messageEditor() );
				this.messagesAttachments = new bp.Views.MessagesAttachments( { model: this.model } );
				this.views.add( '#bp-message-content', this.messagesAttachments );

				this.views.add( '#bp-message-content', new bp.Views.MessageFormSubmitWrapper( { model: this.model } ) );

				// Activate bp_mentions.
				this.on( 'ready', this.addSelect2, this );
			},

			closeComposeForm: function( event ) {
				event.preventDefault();
				var form = bp.Nouveau.Messages.views.get( 'compose' );
				form.get( 'view' ).remove();
				bp.Nouveau.Messages.views.remove( { id: 'compose', view: form } );
				bp.Nouveau.Messages.router.navigate( 'view/' + bp.Nouveau.Messages.threads.at( 0 ).id + '/', { trigger: true } );
				$( '.bp-messages-container' ).removeClass( 'bp-compose-message' );
			},

			addMentions: function() {
				// Add autocomplete to send_to field.
				$( this.el ).find( '#send-to-input' ).bp_mentions(
					{
						data: [],
						suffix: ' '
					}
				);
			},

			addSelect2: function() {
				var $input    = $( this.el ).find( '#send-to-input' );
				var ArrayData = [];
				if ( $input.prop( 'tagName' ) != 'SELECT' ) {
					this.addMentions();
					return;
				}

				$input.select2(
					{
						placeholder: '',
						minimumInputLength: 1,
						dropdownCssClass: 'bb-select-dropdown bb-compose-input',
						containerCssClass: 'bb-select-container',
						language: {
							errorLoading: function() {
								return bp_select2.i18n.errorLoading;
							},
							inputTooLong: function(e) {
								var n = e.input.length - e.maximum;
								return bp_select2.i18n.inputTooLong.replace( '%%', n );
							},
							inputTooShort: function() {
								return bp_select2.i18n.msginputTooShort;
							},
							loadingMore: function() {
								return bp_select2.i18n.loadingMore;
							},
							maximumSelected: function(e) {
								return bp_select2.i18n.maximumSelected.replace( '%%', e.maximum );
							},
							noResults: function() {
								return bp_select2.i18n.noResults;
							},
							searching: function() {
								return bp_select2.i18n.searching;
							},
							removeAllItems: function() {
								return bp_select2.i18n.removeAllItems;
							}
						},
						ajax: {
							url: bp.ajax.settings.url,
							dataType: 'json',
							delay: 250,
							data: function(params) {
								return $.extend(
									{},
									params,
									{
										nonce: BP_Nouveau.messages.nonces.load_recipient,
										action: 'messages_search_recipients',
										page: ( 'undefined' === typeof params.page ) ? 1 : params.page
									}
								);
							},
							cache: true,
							processResults: function( data, params ) {
								var cval = $( this.container.$container ).find( '.select2-search__field' ).val();
								if ( cval.length < 1 ) {
									return {
										results: []
									};
								}
								// Removed the element from results if already selected.
								if ( false === jQuery.isEmptyObject( ArrayData ) ) {
									$.each(
										ArrayData,
										function( index, value ) {
											for ( var i = 0; i < data.data.results.length; i++ ) {
												if (data.data.results[i].id === value) {
													data.data.results.splice( i,1 );
												}
											}
										}
									);
								}

								params.page = params.page || 1;

								return {
									results: data && data.success ? data.data.results : [],
									pagination: {
										more: params.page < data.data.total_pages
									}
								};
							}
						},
						templateResult: function ( data ) {
							return ( data.html ? data.html : data.text );
						},
						escapeMarkup: function ( markup ) {
							return markup;
						}
					}
				);

				// Add element into the Arrdata array.
				$input.on(
					'select2:select',
					function(e) {
						var data = e.params.data;
						ArrayData.push( data.id );
					}
				);

				// Remove element into the Arrdata array.
				$input.on(
					'select2:unselect',
					function(e) {
						var data  = e.params.data;
						ArrayData = jQuery.grep(
							ArrayData,
							function(value) {
								return value != data.id;
							}
						);
					}
				);

			},

			resetFields: function( model ) {
				// Clean inputs.
				_.each(
					model.previousAttributes(),
					function( value, input ) {
						if ( 'message_content' === input ) {
							// tinyMce.
							if ( typeof tinyMCE !== 'undefined' && undefined !== tinyMCE.activeEditor && null !== tinyMCE.activeEditor ) {
								tinyMCE.activeEditor.setContent( '' );
							} else if ( undefined !== bp.Nouveau.Messages.mediumEditor && false !== bp.Nouveau.Messages.mediumEditor ) {
								bp.Nouveau.Messages.mediumEditor.setContent( '' );
							}

							// All except meta or empty value.
						} else if ( 'meta' !== input && false !== value ) {
							$( 'input[name="' + input + '"]' ).val( '' );
						}
					}
				);

				// Listen to this to eventually reset your custom inputs.
				$( this.el ).trigger( 'message:reset', _.pick( model.previousAttributes(), 'meta' ) );
			},

			sendMessage: function( event ) {
				var meta = {}, errors = [], self = this;
				event.preventDefault();

				bp.Nouveau.Messages.removeFeedback();

				// reset receipients field before send.
				this.model.set( 'send_to', [], { silent: true } );

				// Set the content and meta.
				_.each(
					this.$el.serializeArray(),
					function( pair ) {
						pair.name = pair.name.replace( '[]', '' );

						// Group extra fields in meta.
						if ( -1 === _.indexOf( ['send_to', 'message_content'], pair.name ) ) {
							if ( _.isUndefined( meta[ pair.name ] ) ) {
								meta[ pair.name ] = pair.value;
							} else {
								if ( ! _.isArray( meta[ pair.name ] ) ) {
									meta[ pair.name ] = [ meta[ pair.name ] ];
								}

								meta[ pair.name ].push( pair.value );
							}

							// Prepare the core model.
						} else {
							// Send to.
							if ( 'send_to' === pair.name ) {
								var usernames = pair.value.match( /(^|[^@\w\-])@([a-zA-Z0-9_\-\.]{1,50})\b/g );

								if ( ! usernames ) {
									errors.push( 'send_to' );
								} else {
									usernames = usernames.map(
										function( username ) {
											username = $.trim( username );
											return username;
										}
									);

									if ( ! usernames || ! $.isArray( usernames ) ) {
										errors.push( 'send_to' );
									}

									var send_to = this.model.get( 'send_to' );
									usernames   = _.union( send_to, usernames );
									this.model.set( 'send_to', usernames, { silent: true } );
								}

								// Subject and content.
							} else {
								// Message content.
								if ( 'message_content' === pair.name && undefined !== tinyMCE.activeEditor ) {
									pair.value = tinyMCE.activeEditor.getContent();
								} else if ( 'message_content' === pair.name && undefined !== bp.Nouveau.Messages.mediumEditor ) {
									pair.value = bp.Nouveau.Messages.mediumEditor.getContent();
								}

								if ( ! pair.value ) {
									errors.push( pair.name );
								} else {
									this.model.set( pair.name, pair.value, { silent: true } );
								}
							}
						}

					},
					this
				);

				// quill editor support.
				if ( bp.Nouveau.Messages.mediumEditor !== false && typeof bp.Nouveau.Messages.mediumEditor !== 'undefined' ) {
					$( '#message_content' ).find( 'img.emojioneemoji' ).replaceWith(
						function () {
							return this.dataset.emojiChar;
						}
					);
					this.model.set( 'message_content', bp.Nouveau.Messages.mediumEditor.getContent(), { silent: true } );
				}

				// check recipients empty.
				if ( ! this.model.get( 'send_to' ).length ) {
					errors.push( 'send_to' );
				}

				// check message content empty.
				this.model.set( 'message_content', this.model.get( 'message_content' ).replace( /&nbsp;/g, '' ).trim(), { silent: true } );
				if ( this.model.get( 'message_content' ) === '' && ( typeof this.model.get( 'video' ) !== 'undefined' && ! this.model.get( 'video' ).length ) && ( typeof this.model.get( 'document' ) !== 'undefined' && ! this.model.get( 'document' ).length ) && ( typeof this.model.get( 'media' ) !== 'undefined' && ! this.model.get( 'media' ).length ) && ( typeof this.model.get( 'gif_data' ) !== 'undefined' && ! Object.keys( this.model.get( 'gif_data' ) ).length ) ) {
					errors.push( 'message_content' );
				}

				if ( errors.length ) {
					var feedback = '';
					_.each(
						errors,
						function( e ) {
							feedback += BP_Nouveau.messages.errors[ e ] + '<br/>';
						}
					);

					bp.Nouveau.Messages.displayComposeFeedback( feedback, 'error' );
					return;
				}

				if ( this.model.get( 'message_content' ) === '' && ( ( typeof this.model.get( 'document' ) !== 'undefined' && this.model.get( 'document' ).length ) || ( typeof this.model.get( 'media' ) !== 'undefined' && this.model.get( 'media' ).length ) || ( typeof this.model.get( 'video' ) !== 'undefined' && this.model.get( 'video' ).length ) || ( typeof this.model.get( 'gif_data' ) !== 'undefined' && Object.keys( this.model.get( 'gif_data' ) ).length ) ) ) {
					this.model.set( 'message_content', '', { silent: true } );
				}

				// Set meta.
				this.model.set( 'meta', meta, { silent: true } );

				$( '#bp-messages-send' ).prop( 'disabled',true ).addClass( 'loading' ).closest( '#bp-message-content' ).removeClass( 'focus-in--content' );

				// Send the message.
				this.model.sendMessage().done(
					function( response ) {
						// Reset the model.
						self.model.set( self.resetModel );

						// Remove tinyMCE.
						bp.Nouveau.Messages.removeTinyMCE();

						// media modal images remove or save option if saved.
						var medias = self.model.get( 'media' );
						if ( typeof medias !== 'undefined' && medias.length ) {
							for ( var k = 0; k < medias.length; k++ ) {
								medias[k].saved = true;
							}
							self.model.set( 'media',medias );
						}

						var document = self.model.get( 'document' );
						if ( typeof document !== 'undefined' && document.length ) {
							for ( var d = 0; d < document.length; d++ ) {
								document[d].saved = true;
							}
							self.model.set( 'document',document );
						}

						var video = self.model.get( 'video' );
						if ( typeof video !== 'undefined' && video.length ) {
							for ( var v = 0; v < video.length; v++ ) {
								video[v].saved = true;
							}
							self.model.set( 'video',video );
						}

						// clear message attachments and toolbar.
						if (self.messagesAttachments !== false) {
							self.messagesAttachments.onClose();
						}

						// Remove the form view.
						var form = bp.Nouveau.Messages.views.get( 'compose' );
						form.get( 'view' ).remove();
						bp.Nouveau.Messages.views.remove( { id: 'compose', view: form } );
						bp.Nouveau.Messages.router.navigate( 'view/' + response.thread.id + '/', { trigger: true } );
						$( '.bp-messages-container' ).removeClass( 'bp-compose-message' );

						var threads = bp.Nouveau.Messages.threads.parse( { threads : [ response.thread ] } );
						bp.Nouveau.Messages.threads.unshift( _.first( threads ) );

					}
				).fail(
					function( response ) {
						if ( response.feedback ) {
							bp.Nouveau.Messages.displayFeedback( response.feedback, response.type );
						}

						$( '#bp-messages-send' ).prop( 'disabled',false ).removeClass( 'loading' );
					}
				);
			},

			resetForm: function( event ) {
				event.preventDefault();

				this.model.set( this.resetModel );
			}
		}
	);

	bp.Views.userThreads = bp.Nouveau.Messages.View.extend(
		{
			tagName   : 'div',
			className : 'bp-messages-user-threads',
			loadingFeedback : false,

			events: {
				'click .bp-message-link' : 'changePreview',
				'scroll' : 'scrolled',
				'click .close-conversation' : 'doAction',
				'click .message-thread-options > .bb_more_options_action' : 'ToggleOptions',
				'click .bb_more_options_list a' : 'doThreadAction',
				'click .bb_more_options_list button' : 'doThreadAction',
			},

			initialize: function() {
				var Views = [
					new bp.Nouveau.Messages.View( { tagName: 'ul', id: 'message-threads', className: 'message-lists' } )
				];

				this.listenTo( Backbone, 'relistelements', this.updateThreadsList );

				_.each(
					Views,
					function( view ) {
						this.views.add( view );
					},
					this
				);

				// Load threads for the active view.
				if ( BP_Nouveau.messages.hasThreads ) {
					this.requestThreads();
				} else {
					this.threadsFetchError( {}, { feedback : BP_Nouveau.messages.errors.no_messages, type: 'info' } );
				}

				this.collection.on( 'reset', this.cleanContent, this );
				this.collection.on( 'add', this.addThread, this );
			},

			requestThreads: function() {
				this.collection.reset();

				$( '.bp-messages.bp-user-messages-loading' ).remove();
				$( '.bb-messages-no-thread-found' ).remove();

				this.loadingFeedback = new bp.Views.MessagesLoading();
				this.views.add( this.loadingFeedback );

				this.collection.fetch(
					{
						data    : _.pick( this.options, 'box' ),
						success : _.bind( this.threadsFetched, this ),
						error   : _.bind( this.threadsFetchError, this )
					}
				);
			},

			updateThreadsList: function ( response ) {
				var updatedThread = '';
				if ( 'undefined' !== typeof response && 'undefined' !== typeof response.thread_id ) {
					this.collection.models.forEach(
						function ( thread ) {
							var thread_id = parseInt( thread.id );
							if ( thread_id === parseInt( response.thread_id ) ) {

								if ( $( document.body ).find( '#message-threads li.' + thread_id ).hasClass( 'current' ) ) {
									thread.set( { unread: false } );
								} else {
									thread.set( { unread: true } );
								}

								thread.set( { excerpt: response.message.excerpt } );
								thread.set( { sender_name: response.message.sender_name } );
								if ( 'undefined' !== typeof response.message.display_date_list ) {
									thread.set( { display_date: response.message.display_date_list } );
								}
								updatedThread = thread;
								bp.Nouveau.Messages.threads.remove( bp.Nouveau.Messages.threads.get( thread_id ) );
								return;
							}
						}
					);
				}

				if ( '' !== updatedThread ) {
					var threads = bp.Nouveau.Messages.threads.parse( { threads: [ updatedThread ] } );
					bp.Nouveau.Messages.threads.unshift( _.first( threads ) );
				} else {
					this.requestThreads();
				}

				$( '.bp-messages-threads-list .message-lists > li .thread-subject' ).each( function() {
					var available_width = $( this ).width() - 10;
					var date_width = $( this ).find( '.thread-date' ).width();
					$( this ).find( '.thread-excerpt' ).css( { 'max-width': available_width - date_width } );
					$( this ).find( '.typing-indicator' ).css( { 'max-width': available_width - date_width } );
				});

				bp.Nouveau.Messages.removeFeedback();
			},

			threadsFetched: function() {
				this.loadingFeedback.remove();

				// Display the bp_after_member_messages_loop hook.
				if ( this.collection.options.afterLoop ) {
					this.views.add( new bp.Views.Hook( { extraContent: this.collection.options.afterLoop, className: 'after-messages-loop' } ), { at: 1 } );
				}

				// Display the bp_before_member_messages_loop hook.
				if ( this.collection.options.beforeLoop ) {
					this.views.add( new bp.Views.Hook( { extraContent: this.collection.options.beforeLoop, className: 'before-messages-loop' } ), { at: 0 } );
				}

				if ( this.collection.length ) {
					$( '.bp-messages-threads-list' ).removeClass( 'bp-no-messages' ).closest( '.bp-messages-container' ).removeClass( 'bp-no-messages' );
					$( '.bp-messages-container' ).find( '.bp-messages-nav-panel.loading' ).removeClass( 'loading' );
					bp.Nouveau.Messages.displayFilters( this.collection );
				}
			},

			threadsFetchError: function( collection, response ) {
				if ( ! _.isUndefined( this.options.search_terms ) && this.options.search_terms !== '' ) {
					this.loadingFeedback = new bp.Views.Feedback(
						{
							value: response.feedback,
							type: response.type
						}
					);
					this.views.add( this.loadingFeedback );
				}

				if ( ! collection.length ) {
					$( '.bp-messages-threads-list' ).addClass( 'bp-no-messages' ).closest( '.bp-messages-container' ).addClass( 'bp-no-messages' );
					$( '.bp-messages-container' ).find( '.bp-messages-nav-panel.loading' ).removeClass( 'loading' );
					$( '.bp-messages.bp-user-messages-loading' ).remove();
					this.views.add( new bp.Views.MessagesNoThreads() );
				}
			},

			scrolled: function( event ) {
				var target = $( event.currentTarget );

				if ( target.scrollTop() > 5 ) {
					target.closest( '.bp-messages-nav-panel' ).addClass( 'threads-scrolled' );
				} else {
					target.closest( '.bp-messages-nav-panel' ).removeClass( 'threads-scrolled' );
				}

				if ( ( target[0].scrollHeight - target.scrollTop() ) >= ( target.innerHeight() - 5 ) &&
					this.collection.length &&
					this.collection.options.page < this.collection.options.total_page &&
					! target.find( '.bp-user-messages-loading' ).length
				) {
					this.collection.options.page = this.collection.options.page + 1;

					this.loadingFeedback = new bp.Views.MessagesLoading();
					this.views.add( this.loadingFeedback );

					_.extend( this.collection.options, _.pick( bp.Nouveau.Messages.filters.attributes, ['box', 'search_terms'] ) );

					this.collection.fetch(
						{
							remove  : false,
							data    : _.pick( this.collection.options, ['box', 'search_terms', 'page'] ),
							success : _.bind( this.threadsFetched, this ),
							error   : _.bind( this.threadsFetchError, this )
						}
					);
				}
			},

			cleanContent: function() {
				_.each(
					this.views._views['#message-threads'],
					function( view ) {
						view.remove();
					}
				);
			},

			addThread: function( thread ) {
				var selected = this.collection.findWhere( { active: true } );

				if ( _.isUndefined( selected ) ) {
					thread.set( 'active', true );
				}

				this.views.add( '#message-threads', new bp.Views.userThread( { model: thread } ), { at: this.collection.indexOf( thread ) } );
			},

			setActiveThread: function( active ) {
				if ( ! active ) {
					return;
				}

				_.each(
					this.collection.models,
					function( thread ) {
						if ( thread.id === active ) {
							thread.set( 'active', true );
						} else {
							thread.unset( 'active' );
						}
					},
					this
				);
			},

			changePreview: function( event ) {
				var target = $( event.currentTarget );
				bp.Nouveau.Messages.divider = [];
				bp.Nouveau.Messages.previous = '';

				event.preventDefault();
				bp.Nouveau.Messages.removeFeedback();

				this.setActiveThread( target.data( 'thread-id' ) );
				var selected = this.collection.findWhere( { active: true } );

				if ( selected.get( 'unread' ) ) {
					selected.updateReadState().done(
						function() {
							selected.set( 'unread', false );

							bp.Nouveau.Messages.router.navigate(
								'view/' + target.data( 'thread-id' ) + '/',
								{ trigger: true }
							);
						}
					);
				} else {
					bp.Nouveau.Messages.router.navigate(
						'view/' + target.data( 'thread-id' ) + '/',
						{ trigger: true }
					);
				}

				$.each(
					$( '.thread-content' ),
					function() {
						$( this ).removeClass( 'current' );
					}
				);

				target.addClass( 'current' );
				target.parents( '.bp-messages-container' ).removeClass( 'bp-compose-message' ).addClass( 'bp-view-message' );
			},

			doAction: function( event ) {
				var action   = $( event.currentTarget ).data( 'bp-action' ), options = {},
					id		 = $( event.currentTarget ).data( 'bp-thread-id' ),
					feedback = BP_Nouveau.messages.doingAction;

				if ( ! action ) {
					return event;
				}

				event.preventDefault();

				if ( ! _.isUndefined( feedback[ action ] ) ) {
					bp.Nouveau.Messages.displayFeedback( feedback[ action ], 'loading' );
				}

				bp.Nouveau.Messages.threads.doAction( action, id, options ).done(
					function() {

						// Remove previous feedback.
						bp.Nouveau.Messages.removeFeedback();

						if ( 'hide_thread' === action ) {
							bp.Nouveau.Messages.threads.remove( bp.Nouveau.Messages.threads.get( id ) );
							bp.Nouveau.Messages.router.navigate( 'view/' + bp.Nouveau.Messages.threads.at( 0 ).id + '/', { trigger: true } );
						}

					}
				).fail(
					function( response ) {
						// Remove previous feedback.
						bp.Nouveau.Messages.removeFeedback();

						bp.Nouveau.Messages.displayFeedback( response.feedback, response.type );
					}
				);
			},

			ToggleOptions: function( event ) {
				$( event.currentTarget ).closest( '.thread-item' ).toggleClass( 'optionsOpen' ).siblings().removeClass( 'optionsOpen' );
			},

			doThreadAction: function( event ) {
				bp.Nouveau.Messages.threadAction( event, this );
			}
		}
	);

	bp.Views.userThread = bp.Nouveau.Messages.View.extend(
		{
			tagName   : 'li',
			template  : bp.template( 'bp-messages-thread' ),
			className : 'thread-item',

			events: {
				'click .message-check' : 'singleSelect'
			},

			initialize: function() {
				if ( this.model.get( 'unread' ) ) {
					this.el.className += ' unread';
				}

				if ( this.model.get( 'is_group' ) && 1 === this.model.get( 'is_group_thread' ) ) {
					this.el.className += ' group-thread';
				}

				if ( 1 === this.model.get( 'can_user_send_message_in_thread' ) || true === this.model.get( 'can_user_send_message_in_thread' ) ) {
					this.el.className += ' can-send-msg';
				} else if ( 0 === this.model.get( 'can_user_send_message_in_thread' ) || false === this.model.get( 'can_user_send_message_in_thread' ) ) {
					this.el.className += ' can-not-send-msg';
				}

				// Add thread id into the li class.
				this.el.className += ' ' + this.model.get( 'id' );

				if ( $( '#thread-id' ).val() == this.model.get( 'id' ) ) {
					this.el.className += ' current';
				}

				var recipientsCount = 0, toOthers = '';
				if ( this.model.get( 'action_recipients' ) ) {
					recipientsCount = this.model.get( 'action_recipients' ).count;
				}

				if ( recipientsCount > 4 ) {
					toOthers = BP_Nouveau.messages.toOthers.other;
				}

				this.model.set(
					{
						recipientsCount: recipientsCount,
						toOthers: toOthers
					},
					{ silent: true }
				);

				this.model.on( 'change:unread', this.updateReadState, this );
				this.model.on( 'change:checked', this.bulkSelect, this );
				this.model.on( 'remove', this.cleanView, this );
			},

			updateReadState: function( model, state ) {
				if ( false === state ) {
					$( this.el ).removeClass( 'unread' );
				} else {
					$( this.el ).addClass( 'unread' );
				}
			},

			bulkSelect: function( model ) {
				if ( $( '#bp-message-thread-' + model.get( 'id' ) ).length ) {
					$( '#bp-message-thread-' + model.get( 'id' ) ).prop( 'checked',model.get( 'checked' ) );
				}
			},

			singleSelect: function( event ) {
				var isChecked = $( event.currentTarget ).prop( 'checked' );

				// To avoid infinite loops.
				this.model.set( 'checked', isChecked, { silent: true } );

				var hasChecked = false;

				_.each(
					this.model.collection.models,
					function( model ) {
						if ( true === model.get( 'checked' ) ) {
							hasChecked = true;
						}
					}
				);

				if ( hasChecked ) {
					$( '#user-messages-bulk-actions' ).closest( '.bulk-actions-wrap' ).removeClass( 'bp-hide' );

					// Inform the user about how to use the bulk actions.
					bp.Nouveau.Messages.displayFeedback( BP_Nouveau.messages.howtoBulk, 'info' );
				} else {
					$( '#user-messages-bulk-actions' ).closest( '.bulk-actions-wrap' ).addClass( 'bp-hide' );

					bp.Nouveau.Messages.removeFeedback();
				}
			},

			cleanView: function() {
				this.views.view.remove();
			}
		}
	);

	bp.Views.Pagination = bp.Nouveau.Messages.View.extend(
		{
			tagName   : 'li',
			className : 'last filter',
			template  :  bp.template( 'bp-messages-paginate' )
		}
	);

	bp.Views.filterSearchLoader = bp.Nouveau.Messages.View.extend(
		{
			tagName  : 'div',
			className : 'messages-search-loader',
			template : bp.template( 'bp-messages-filter-loader' ),
		}
	);

	bp.Views.messageFilters = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'ul',
			template:  bp.template( 'bp-messages-filters' ),

			events : {
				'search #user_messages_search'      : 'resetSearchTerms',
				'submit #user_messages_search_form' : 'setSearchTerms',
				'click #bp-messages-next-page'      : 'nextPage',
				'click #bp-messages-prev-page'      : 'prevPage',
				'click #user_messages_search_reset' : 'resetSearchForm'
			},

			initialize: function() {
				this.model.on( 'change', this.filterThreads, this );
			},

			addPagination: function( collection ) {
				_.each(
					this.views._views,
					function( view ) {
						if ( ! _.isUndefined( view ) ) {
							_.first( view ).remove();
						}
					}
				);

				this.views.add( new bp.Views.Pagination( { model: new Backbone.Model( collection.options ) } ) );
			},

			filterThreads: function() {
				var loader = new bp.Views.filterSearchLoader().render().el;
				$( '.bp-messages-search-feedback' ).html( loader );

				this.options.threads.reset();
				_.extend( this.options.threads.options, _.pick( this.model.attributes, ['box', 'search_terms'] ) );

				this.options.threads.fetch(
					{
						data    : _.pick( this.model.attributes, ['box', 'search_terms', 'page'] ),
						success : this.threadsFiltered,
						error   : this.threadsFilterError
					}
				);
			},

			threadsFiltered: function() {
				bp.Nouveau.Messages.removeFeedback();
				$( '.bb-messages-no-thread-found' ).remove();
				$( '.messages-search-loader' ).remove();
				$( '.bp-messages-threads-list .message-lists > li .thread-subject' ).each( function() {
					var available_width = $( this ).width() - 10;
					var date_width = $( this ).find( '.thread-date' ).width();
					$( this ).find( '.thread-excerpt' ).css( { 'max-width': available_width - date_width } );
					$( this ).find( '.typing-indicator' ).css( { 'max-width': available_width - date_width } );
				});
			},

			threadsFilterError: function( collection, response ) {
				bp.Nouveau.Messages.removeFeedback();
				$( '.messages-search-loader' ).remove();

				if ( ! _.isUndefined( collection._events.add[0].context.views ) ) {
					collection._events.add[0].context.views.add( new bp.Views.MessagesSearchNoThreads() );
				}

				if ( 'error' === response.type ) {
					bp.Nouveau.Messages.displaySearchFeedback( response.feedback, response.type );
				}
			},

			resetSearchTerms: function( event ) {
				event.preventDefault();

				$( '.bb-messages-search-no-thread-found' ).hide();
				if ( ! $( event.target ).val() ) {
					$( event.target ).closest( 'form' ).submit();
				} else {
					$( event.target ).closest( 'form' ).find( '[type=submit]' ).addClass( 'bp-show' ).removeClass( 'bp-hide' );
				}

				if ( '' !== $( event.target ).val() ) {
					$( event.target ).closest( 'form' ).find( '#user_messages_search_reset' ).removeClass( 'bp-hide' );
				}
			},

			setSearchTerms: function( event ) {
				event.preventDefault();

				this.model.set(
					{
						'search_terms': $( event.target ).find( 'input[type=search]' ).val() || '',
						page: 1
					}
				);

				if ( '' !== $( event.target ).find( 'input[type=search]' ).val() ) {
					$( event.target ).closest( 'form' ).find( '#user_messages_search_reset' ).removeClass( 'bp-hide' );
				}
			},

			nextPage: function( event ) {
				event.preventDefault();

				this.model.set( 'page', this.model.get( 'page' ) + 1 );
			},

			prevPage: function( event ) {
				event.preventDefault();

				this.model.set( 'page', this.model.get( 'page' ) - 1 );
			},

			resetSearchForm: function( event ) {
				event.preventDefault();

				$( '.bb-messages-search-no-thread-found' ).hide();
				var form = $( event.target ).closest( '#user_messages_search_form' );

				if ( '' !== form.find( '#user_messages_search' ).val() ) {
					this.model.set(
						{
							'search_terms': '',
							page: 1
						}
					);

					form.trigger( 'reset' );
					form.find( '#user_messages_search_reset' ).addClass( 'bp-hide' );
				}

			},
		}
	);

	bp.Views.userMessagesLoadMore = bp.Nouveau.Messages.View.extend(
		{
			tagName  : 'div',
			template : bp.template( 'bp-messages-single-load-more' ),

			events: {
				'click button' : 'loadMoreMessages'
			},

			loadMoreMessages: function(e) {
				e.preventDefault();

				var data = {};

				$( this.$el ).find( 'button' ).addClass( 'loading' );
				$( this.$el ).parent().addClass( 'loading' );

				if ( _.isUndefined( this.options.thread.attributes ) ) {
					data.id = this.options.thread.id;
				} else {
					data.id        = this.options.thread.get( 'id' );
					data.js_thread = ! _.isEmpty( this.options.thread.get( 'subject' ) );
				}

				this.collection.fetch(
					{
						data: data,
						success: _.bind( this.options.userMessage.messagesFetched, this.options.userMessage ),
						error: _.bind( this.options.userMessage.messagesFetchError, this.options.userMessage )
					}
				);

			}
		}
	);

	bp.Views.userMessagesHeader = bp.Nouveau.Messages.View.extend(
		{
			tagName  : 'div',
			template : bp.template( 'bp-messages-single-header' ),

			events: {
				'click .actions a' : 'doAction',
				'click .actions button' : 'doAction',
				'click .bp-back-to-thread-list' : 'navigateToList',
				'click .message_actions .message_action__anchor' : 'showOptions',
			},

			initialize: function() {

				$( document ).on(
					'click',
					'.messages',
					function(event) {

						if ( $( event.target ).hasClass( 'message_action__anchor' ) || $( event.target ).parent().hasClass( 'message_action__anchor' ) ) {
							return event;
						} else {
							$( '.message_action__list.open' ).removeClass( 'open' ).closest( '.message_actions').removeClass( 'open' );
						}

					}
				);

			},

			navigateToList: function( event ) {
				event.preventDefault();
				bp.Nouveau.Messages.router.navigate( '/' );
				$( '.bp-messages-container' ).removeClass( 'bp-view-message bp-compose-message' );
			},

			doAction: function( event ) {
				bp.Nouveau.Messages.threadAction( event, this );
			},

			showOptions: function( event ) {
				event.preventDefault();
				var currentTarget = event.currentTarget;
				$( currentTarget ).siblings( '.message_action__list' ).toggleClass( 'open' ).closest( '.message_actions').toggleClass( 'open' );
			},

		}
	);

	bp.Views.userMessagesEntry = bp.Views.userMessagesHeader.extend(
		{
			tagName     : 'li',
			template    : bp.template( 'bp-messages-single-list' ),

			events: {
				'click [data-bp-action]' : 'doAction',
				'click .remove-message' : 'removeMessage',
				'click .retry-message' : 'retryMessage'
			},

			initialize: function() {

				this.el.className = ' ';

				if ( this.options.model.attributes.className ) {
					this.el.className += ' ' + this.options.model.attributes.className;
					this.render();
				}
				this.model.on( 'change', this.updateMessage, this );
				this.model.on( 'change', this.updateMessageClass, this );

			},

			updateMessage: function( model ) {
				if ( this.model.get( 'id' ) !== model.get( 'id' ) ) {
					return;
				}

				if ( this.options.className ) {
					this.el.className += ' ' + this.options.className;
				}

				this.render();
			},

			updateMessageClass: function ( model ) {
				this.$el.addClass( model.attributes.className );
			},

			removeMessage: function () {
				bp.Nouveau.Messages.messages.remove( bp.Nouveau.Messages.messages.findWhere().collection.get( this.model.id ) );
				this.$el.remove();
			},

			retryMessage: function ( model ) {
				var action = $( model.currentTarget ).data( 'action' ) + '&resend=true';
				$.ajax(
					{
						type: 'POST',
						url: BP_Nouveau.ajaxurl,
						data: action,
						success: function () {}
					}
				);
			}
		}
	);

	bp.Views.MessageReplyFormSubmit = bp.Nouveau.Messages.View.extend(
		{
			tagName   : 'div',
			className   : 'submit',
			id        : 'message-reply-new-submit',
			template  : bp.template( 'bp-messages-reply-form-submit' )
		}
	);

	bp.Views.MessageReplyFormSubmitWrapper = bp.Nouveau.Messages.View.extend(
		{
			tagName: 'div',
			id: 'message-reply-form-submit-wrapper',
			initialize: function() {
				this.views.add( new bp.Views.MessagesToolbar( { model: this.model } ) );
				this.views.add( new bp.Views.FormattingToolbar( { model: this.model } ) );
				this.views.add( new bp.Views.MessageReplyFormSubmit( { model: this.model } ) );
			}
		}
	);

	bp.Views.userMessages = bp.Nouveau.Messages.View.extend(
		{
			tagName  : 'div',
			className  : 'bp-messages-content-wrapper',
			template : bp.template( 'bp-messages-single' ),
			messageAttachments : false,
			firstFetch : true,
			firstLi : true,
			loadingFeedback: false,
			last_date: '',
			last_date_display: '',

			initialize: function() {
				// Load Messages.
				this.requestMessages();

				// Init a reply.
				this.model = new bp.Models.messageThread();

				this.collection.on( 'add', this.addMessage, this );

				// Add the editor view.
				this.views.add( '#bp-message-content', new bp.Views.messageEditor() );
				this.messageAttachments = new bp.Views.MessagesAttachments( { model: this.model } );
				this.views.add( '#bp-message-content', this.messageAttachments );

				this.views.add( '#bp-message-content', new bp.Views.MessageReplyFormSubmitWrapper( { model: this.model } ) );

				this.views.add(
					'#bp-message-load-more',
					new bp.Views.userMessagesLoadMore(
						{
							collection: this.collection,
							thread: this.options.thread,
							userMessage: this
						}
					)
				);

				this.listenTo( Backbone, 'onSentMessage', this.triggerPusherMessage );
				this.listenTo( Backbone, 'onSentMessageError', this.triggerPusherUpdateErrorMessage );
				this.listenTo( Backbone, 'onReplySentSuccess', this.triggerPusherUpdateMessage );
				this.listenTo( Backbone, 'onReplyReSend', this.triggerPusherUpdateReSendMessage );
				this.listenTo( Backbone, 'onMessageDeleteSuccess', this.triggerDeleteUpdateMessage );
				this.listenTo( Backbone, 'onMessageAjaxFail', this.triggerAjaxFailMessage );
			},

			triggerPusherMessage: function ( messagePusherData ) {

				var split_message = jQuery.extend(true, {}, _.first( messagePusherData ) );
				var date = split_message.date,
					year = date.getFullYear(),
					month = String( date.getMonth() + 1 ).padStart( 2, '0' ),
					day = String( date.getDate() ).padStart( 2, '0' ),
					split_date = year + '-' + month + '-' + day;

				if ( $.inArray( split_date, bp.Nouveau.Messages.divider ) === -1 ) {
					split_message.hash = '';
					split_message.id = split_date;
					split_message.content = BP_Nouveau.messages.today;
					split_message.sender_avatar = '';
					split_message.sender_id = '';
					split_message.sender_is_you = '';
					split_message.sender_link = '';
					split_message.sender_name = '';
					split_message.display_date = '';
					split_message.group_text = '';
					split_message.group_name = '';
					split_message.group_avatar = '';
					split_message.group_link = '';
					split_message.message_from = '';
					split_message.class_name = 'divider-date';
					delete split_message.className;

					if ( typeof split_message.gif !== 'undefined' ) {
						delete split_message.gif;
					}

					if ( typeof split_message.video !== 'undefined' ) {
						delete split_message.video;
					}

					if ( typeof split_message.document !== 'undefined' ) {
						delete split_message.document;
					}

					if ( typeof split_message.media !== 'undefined' ) {
						delete split_message.media;
					}

					bp.Nouveau.Messages.divider.push( split_date );
					this.collection.add( split_message );
				}

				// use sent messageData here.
				this.collection.add( _.first( messagePusherData ) );
				$( '#bp-message-thread-list' ).animate( { scrollTop: $( '#bp-message-thread-list' ).prop( 'scrollHeight' ) }, 0 );
			},

			triggerPusherUpdateErrorMessage: function ( messagePusherData ) {
				var model = this.collection.get( messagePusherData.hash );
				var errorHtml = '<div class="message_send_error"><span class="info-text-error-message">' + messagePusherData.notdeliveredtext + '</span> <a data-action="' + messagePusherData.actions + '" data-hash="' + messagePusherData.hash + '" class="retry-message" href="javascript:void(0);">' + messagePusherData.tryagaintext + '</a> | <a data-hash="' + messagePusherData.hash + '"  class="remove-message" href="javascript:void(0);">' + messagePusherData.canceltext + '</a></div>';
				if ( model ) {
					var content = model.attributes.content;
					if ( content.search( 'message_send_error' ) === -1 ) {
						var $s = $( content );
						if ( $s.find( '.message_send_sending' ).length ) {
							$s = $s.find( '.message_send_sending' ).remove().end();
						}
						var content_html = $s.text() !== '' ? $s.html() : '';
						model.set( 'className', model.attributes.className + ' error' );
						model.set( 'content', content_html + ' ' + errorHtml );
					}
					this.collection.sync( 'update' );
				}
			},

			triggerDeleteUpdateMessage: function ( thread_id ) {
				if (
					'undefined' !== typeof bp.Nouveau.Messages.threads.get( thread_id ) &&
					'undefined' !== typeof bp.Nouveau.Messages.threads.get( thread_id ).attributes.active &&
					true === bp.Nouveau.Messages.threads.get( thread_id ).attributes.active ) {
					bp.Nouveau.Messages.router.navigate( 'view/' + thread_id + '/?refresh=1', { trigger: true } );
					bp.Nouveau.Messages.router.navigate( 'view/' + thread_id + '/', { trigger: true } );
					window.Backbone.trigger( 'relistelements' );
				}
			},

			triggerPusherUpdateMessage: function ( messagePusherData ) {
				var model = this.collection.get( messagePusherData.hash );
				if ( model ) {
					if ( parseInt( messagePusherData.message.sender_id ) === parseInt( BP_Nouveau.current.message_user_id ) ) {
						messagePusherData.message.sender_is_you = true;
					} else {
						messagePusherData.message.sender_is_you = false;
					}
					messagePusherData.message.date = new Date( messagePusherData.message.date );
					model.set( messagePusherData.message );

					if ( $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).length && $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).hasClass( 'has-medias' ) ) {
						$( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).removeClass( 'has-medias' );
					}

					if ( $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).length && $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).hasClass( 'sending' ) ) {
						$( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).removeClass( 'sending' );

					}
					if ( $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).length && $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).hasClass( 'error' ) ) {
						$( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).removeClass( 'error' );
					}
				}
			},

			triggerPusherUpdateReSendMessage: function ( messagePusherData ) {
				messagePusherData = messagePusherData[0];
				var model = this.collection.get( messagePusherData.hash );
				if ( model ) {
					if ( parseInt( messagePusherData.sender_id ) === parseInt( BP_Nouveau.current.message_user_id ) ) {
						messagePusherData.sender_is_you = true;
					} else {
						messagePusherData.sender_is_you = false;
					}
					messagePusherData.date = new Date( messagePusherData.date );
					model.set( messagePusherData );

					if ( $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).length && $( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).hasClass( 'error' ) ) {
						$( document.body ).find( '#bp-message-thread-list li.' + messagePusherData.hash ).removeClass( 'error' );
					}
				}
			},

			triggerAjaxFailMessage: function ( messagePusherData ) {
				var model = this.collection.get( messagePusherData.hash );
				if ( model ) {
					this.collection.remove( model );
					$( '#bp-message-thread-list li.' + messagePusherData.hash ).remove();
				}
			},

			events: {
				'click #send_reply_button' : 'sendReply',
				'click .bp-messages-notice [data-bp-action]' : 'unhideConversation',
			},

			requestMessages: function() {
				var data 					   = {};
				this.options.collection.before = null;

				this.collection.reset();

				this.loadingFeedback = new bp.Views.MessagesLoading();
				this.views.add( '#bp-message-content',this.loadingFeedback );

				if ( _.isUndefined( this.options.thread.attributes ) ) {
					data.id = this.options.thread.id;

				} else {
					data.id        = this.options.thread.get( 'id' );
					data.js_thread = ! _.isEmpty( this.options.thread.get( 'subject' ) );
				}

				this.collection.fetch(
					{
						data: data,
						success : _.bind( this.messagesFetched, this ),
						error: _.bind( this.messagesFetchError, this )
					}
				);
			},

			messagesFetched: function( collection, response ) {
				var loadMore 	  = null;
				collection.before = response.next_messages_timestamp;

				if ( ! _.isUndefined( response.thread ) ) {
					this.options.thread = new Backbone.Model( response.thread );

					var recipientsCount = response.thread.recipients.count, toOthers = '';
					if ( recipientsCount > 4 ) {
						toOthers = BP_Nouveau.messages.toOthers.other;
					}

					this.options.thread.set(
						{
							toOthers: toOthers
						},
						{ silent: true }
					);
				}

				this.loadingFeedback.remove();

				if ( response.feedback_error && response.feedback_error.feedback && response.feedback_error.type ) {
					bp.Nouveau.Messages.displayFeedback( response.feedback_error.feedback, response.feedback_error.type );
					// hide reply form.
					this.$( '#send-reply' ).hide().parent().addClass( 'is_restricted' );
					// if ( ! _.isUndefined( response.thread.is_group_thread ) && response.thread.is_group_thread === 1 ) {
					// 	this.$( '#send-reply' ).show().parent().removeClass( 'is_restricted' );
					// 	$( '#send-reply' ).find( '.message-box' ).show();
					// }
				} else {
					$( '#send-reply' ).find( '.message-box' ).show();
				}

				if ( this.firstFetch ) {
					$( '#bp-message-thread-list' ).animate( { scrollTop: $( '#bp-message-thread-list' ).prop( 'scrollHeight' )}, 100 );
					this.firstFetch = false;
				} else {
					$( '#bp-message-thread-list' ).animate( { scrollTop: this.firstLi.position().top - this.firstLi.outerHeight()}, 0 );
				}

				if ( $( '.bp-single-message-wrap' ).hasClass( 'group-messages-highlight' ) ) {
					$( '.bp-single-message-wrap' ).parents( '#bp-message-thread-list' ).addClass( 'group-message-thread' );
				}

				$( '#bp-message-load-more' ).removeClass( 'loading' );

				if ( response.messages.length < response.per_page && ! _.isUndefined( this.views.get( '#bp-message-load-more' ) ) ) {
					loadMore = this.views.get( '#bp-message-load-more' )[0];
					loadMore.views.view.remove();
				} else {
					loadMore = this.views.get( '#bp-message-load-more' )[0];
					loadMore.views.view.$el.find( 'button' ).removeClass( 'loading' ).show();

					this.firstLi = $( '#bp-message-thread-list>li:first-child' );
				}

				// add scroll event for the auto load messages without user having to click the button.
				$( '#bp-message-thread-list' ).on( 'scroll', this.messages_scrolled );

				if ( ! this.views.get( '#bp-message-thread-header' ) ) {
					this.views.add( '#bp-message-thread-header', new bp.Views.userMessagesHeader( { model: this.options.thread } ) );
				}

				$( '#bp-message-thread-list li' ).each(
					function () {
						$( this ).removeClass( 'divider' );
						$( this ).removeAttr( 'data-divider' );
					}
				);

				// Add class for message form shadow when messages are scrollable.
				var scrollViewScrollHeight = this.$el.find( '#bp-message-thread-list' ).prop('scrollHeight');
				var scrollViewClientHeight = this.$el.find( '#bp-message-thread-list' ).prop('clientHeight');
				if ( scrollViewScrollHeight > scrollViewClientHeight ) {
					this.$el.addClass( 'focus-in--scroll' );
				} else {
					this.$el.removeClass( 'focus-in--scroll' );
				}

				// replace dummy image with original image by faking scroll event to call bp.Nouveau.lazyLoad.
				jQuery( window ).scroll();

			},

			messages_scrolled: function( event ) {
				var target = $( event.currentTarget );
				if ( target.scrollTop() <= 1 ) {
					var button = $( '#bp-message-load-more' ).find( 'button' );
					if ( ! button.hasClass( 'loading' ) ) {
						button.trigger( 'click' );
					}
				}

				if ( target.prop( 'scrollHeight' ) - target.scrollTop() <= target.outerHeight() ) {
					$( '.bp-messages-content-wrapper' ).removeClass( 'scrolled--up' );
				} else {
					$( '.bp-messages-content-wrapper' ).addClass( 'scrolled--up' );
				}

			},

			messagesFetchError: function( collection, response ) {
				var loadMore = null;
				if ( ! response.messages ) {
					collection.hasMore = false;
				}

				$( '#bp-message-load-more' ).removeClass( 'loading' );

				if ( ! response.messages && ! _.isUndefined( this.views.get( '#bp-message-load-more' ) ) ) {
					loadMore = this.views.get( '#bp-message-load-more' )[0];
					loadMore.views.view.remove();
				} else {
					loadMore = this.views.get( '#bp-message-load-more' )[0];
					loadMore.views.view.$el.find( 'button' ).removeClass( 'loading' );
				}

				if ( response.feedback && response.type ) {
					this.loadingFeedback = new bp.Views.Feedback(
						{
							value: response.feedback,
							type: response.type
						}
					);
					this.views.add( '#bp-message-content',this.loadingFeedback );
				}
			},

			addMessage: function( message ) {
				var options = {};

				if ( ! message.attributes.is_new ) {
					options.at = 0;
				}

				if ( 'undefined' !== typeof message.attributes.class_name && '' !== message.attributes.class_name ) {
					message.attributes.className = message.attributes.class_name;
				}

				this.views.add( '#bp-message-thread-list', new bp.Views.userMessagesEntry( { model: message } ), options );

				// replace dummy image with original image by faking scroll event to call bp.Nouveau.lazyLoad.
				jQuery( window ).scroll();
			},

			addEditor: function() {
				// Load the Editor.
				this.views.add( '#bp-message-content', new bp.Views.messageEditor() );
			},

			sendReply: function( event ) {
				var errors = [];
				event.preventDefault();

				if ( true === this.model.get( 'sending' ) ) {
					return;
				}

				var content = '';
				if ( typeof tinyMCE !== 'undefined' ) {
					content = tinyMCE.activeEditor.getContent();
					jQuery( tinyMCE.activeEditor.formElement ).addClass( 'loading' );
				} else if ( typeof bp.Nouveau.Messages.mediumEditor !== 'undefined' ) {
					if ( bp.Nouveau.Messages.mediumEditor.getContent() ) {
						// Before send make sure that medium editor is focus.
						$( bp.Nouveau.Messages.mediumEditor.elements[0] ).focus();

						$( bp.Nouveau.Messages.mediumEditor.getSelectedParentElement() ).find( 'img.emoji' ).each(
							function ( index, Obj ) {
								$( Obj ).addClass( 'emojioneemoji' );
								var emojis = $( Obj ).attr( 'alt' );
								$( Obj ).attr( 'data-emoji-char', emojis );
								$( Obj ).removeClass( 'emoji' );
							}
						);
						$( bp.Nouveau.Messages.mediumEditor.getSelectedParentElement() ).find( 'img.emojioneemoji' ).replaceWith(
							function () {
								return this.dataset.emojiChar;
							}
						);
					}
					content = bp.Nouveau.Messages.mediumEditor.getContent();
					jQuery( '#message_content' ).addClass( 'loading' );
				}

				// Add valid line breaks.
				content = $.trim( content.replace( /<div>/gi, '\n' ).replace( /<\/div>/gi, '' ) );
				content = content.replace( /&nbsp;/g, ' ' );

				if ( $( $.parseHTML( content ) ).text().trim() === '' && ( ( typeof this.model.get( 'document' ) !== 'undefined' && ! this.model.get( 'document' ).length ) && ( typeof this.model.get( 'video' ) !== 'undefined' && ! this.model.get( 'video' ).length ) && ( typeof this.model.get( 'media' ) !== 'undefined' && ! this.model.get( 'media' ).length ) && ( typeof this.model.get( 'gif_data' ) !== 'undefined' && ! Object.keys( this.model.get( 'gif_data' ) ).length ) ) ) {
					errors.push( 'message_content' );
				}

				if ( errors.length ) {
					var feedback = '';
					_.each(
						errors,
						function( e ) {
							feedback += BP_Nouveau.messages.errors[ e ] + '<br/>';
						}
					);

					bp.Nouveau.Messages.displaySendMessageFeedback( feedback, 'error' );
					return;
				}

				if ( content === '' && ( ( typeof this.model.get( 'document' ) !== 'undefined' && this.model.get( 'document' ).length ) || ( typeof this.model.get( 'video' ) !== 'undefined' && this.model.get( 'video' ).length ) || ( typeof this.model.get( 'media' ) !== 'undefined' && this.model.get( 'media' ).length ) || ( typeof this.model.get( 'gif_data' ) !== 'undefined' && Object.keys( this.model.get( 'gif_data' ) ).length ) ) ) {
					content = '';
				}

				this.model.set(
					{
						thread_id : this.options.thread.get( 'id' ),
						content   : content,
						sending   : true
					}
				);

				if ( 'undefined' === typeof bb_pusher_vars || 'undefined' === typeof bb_pusher_vars.is_live_messaging_enabled || 'off' === bb_pusher_vars.is_live_messaging_enabled ) {
					$( '#send_reply_button' ).prop( 'disabled', true ).addClass( 'loading' );
				}
				$( '#send_reply_button' ).closest( '#bp-message-content' ).removeClass( 'focus-in--content' );

				this.collection.sync(
					'create',
					this.model.attributes,
					{
						success : _.bind( this.replySent, this ),
						error   : _.bind( this.replyError, this )
					}
				);

				// Reset the form.
				if ( typeof tinyMCE !== 'undefined' ) {
					tinyMCE.activeEditor.setContent( '' );
					jQuery( tinyMCE.activeEditor.formElement ).removeClass( 'loading' );
				} else if ( typeof bp.Nouveau.Messages.mediumEditor !== 'undefined' ) {
					// Reset Formatting.
					bp.Nouveau.Messages.mediumEditor.resetContent();
					jQuery( '#message_content' ).removeClass( 'loading' );
				}

				this.model.set( 'sending', false );

				// media modal images remove or save option if saved.
				var medias = this.model.get( 'media' );
				if ( typeof medias !== 'undefined' && medias.length ) {
					for ( var k = 0; k < medias.length; k++ ) {
						medias[k].saved = true;
					}
					this.model.set( 'media',medias );
				}

				var documents = this.model.get( 'document' );
				if ( typeof documents !== 'undefined' && documents.length ) {
					for ( var d = 0; d < documents.length; d++ ) {
						documents[d].saved = true;
					}
					this.model.set( 'document',documents );
				}

				var videos = this.model.get( 'video' );
				if ( typeof videos !== 'undefined' && videos.length ) {
					for ( var v = 0; v < videos.length; v++ ) {
						videos[v].saved = true;
					}
					this.model.set( 'video',videos );
				}

				if (this.messageAttachments.onClose) {
					this.messageAttachments.onClose();
				}
			},

			replySent: function( response ) {

				if ( 'undefined' === typeof bb_pusher_vars || 'undefined' === typeof bb_pusher_vars.is_live_messaging_enabled || 'off' === bb_pusher_vars.is_live_messaging_enabled ) {
					var reply = this.collection.parse( response );
					this.collection.add( _.first( reply ) );
				}

				bp.Nouveau.Messages.removeFeedback();

				if ( 'undefined' === typeof bb_pusher_vars || 'undefined' === typeof bb_pusher_vars.is_live_messaging_enabled || 'off' === bb_pusher_vars.is_live_messaging_enabled ) {
					$( '#send_reply_button' ).prop( 'disabled',false ).removeClass( 'loading' );
				}

				$( '#bp-message-thread-list' ).animate( { scrollTop: $( '#bp-message-thread-list' ).prop( 'scrollHeight' )}, 0 );

				//Add class for message form shadow when messages are scrollable
				var scrollViewScrollHeight = this.$el.find( '#bp-message-thread-list' ).prop('scrollHeight');
				var scrollViewClientHeight = this.$el.find( '#bp-message-thread-list' ).prop('clientHeight');
				if ( scrollViewScrollHeight > scrollViewClientHeight ) {
					this.$el.addClass( 'focus-in--scroll' );
				} else {
					this.$el.removeClass( 'focus-in--scroll' );
				}
			},

			replyError: function( response ) {
				this.model.set( 'sending', false );
				if ( response.feedback && response.type ) {
					bp.Nouveau.Messages.displayFeedback( response.feedback, response.type );
				}
				if ( 'undefined' === typeof bb_pusher_vars || 'undefined' === typeof bb_pusher_vars.is_live_messaging_enabled || 'off' === bb_pusher_vars.is_live_messaging_enabled ) {
					$( '#send_reply_button' ).prop( 'disabled',false ).removeClass( 'loading' );
				}
				$( '#send_reply_button' ).closest( '#bp-message-content' ).removeClass( 'focus-in--content' );
			},

			unhideConversation: function ( event ) {
				var action = $( event.currentTarget ).data( 'bp-action' ), options = {},
					id = $( event.currentTarget ).data( 'bp-thread-id' ),
					feedback = BP_Nouveau.messages.doingAction;

				if ( ! action ) {
					return event;
				}

				event.preventDefault();

				if ( ! _.isUndefined( feedback[ action ] ) ) {
					bp.Nouveau.Messages.displayFeedback( feedback[ action ], 'loading' );
				}

				bp.Nouveau.Messages.threads.doAction( action, id, options ).done(
					function () {

						// Remove previous feedback.
						bp.Nouveau.Messages.removeFeedback();

						// Refresh the current thread.
						var hash = Math.round( (new Date()).getTime() / 1000 );
						bp.Nouveau.Messages.router.navigate( 'view/' + id + '/?hash=' + hash, { trigger: true } );
					}
				).fail(
					function ( response ) {
						// Remove previous feedback.
						bp.Nouveau.Messages.removeFeedback();

						bp.Nouveau.Messages.displayFeedback( response.feedback, response.type );
					}
				);
			}
		}
	);

	bp.Views.userArchivedNoThreads = bp.Nouveau.Messages.View.extend(
		{
			tagName  : 'div',
			className  : 'bp-messages-content-wrapper archived-empty',
			template : bp.template( 'bp-messages-single' ),

			initialize: function() {
				var self = this;
				setTimeout(
					function () {
						// Add the empty message view.
						self.views.add( '#bp-message-thread-list', new bp.Views.userArchivedNoMessages() );
					},
					1000
				);
			}
		}
	);

	bp.Views.userArchivedNoMessages = bp.Nouveau.Messages.View.extend(
		{
			tagName  : 'li',
			className  : 'bp-empty-messages-li',
			template : bp.template( 'bp-messages-empty-single-list' ),
		}
	);

	bp.Nouveau.Messages.Router = Backbone.Router.extend(
		{
			routes: {
				'compose/'          : 'composeMessage',
				'view/:id/'         : 'viewMessage',
				'starred/'          : 'starredView',
				'inbox/'            : 'inboxView',
				''                  : 'inboxView',
				'archived/'         : 'viewNoArchivedThread',
				'archived/view/:id/': 'viewArchivedMessage',
			},

			composeMessage: function() {
				bp.Nouveau.Messages.composeView();

				if ( ! _.isUndefined( BP_Nouveau.media ) ) {

					if ( BP_Nouveau.media.messages_document === false ) {
						$( '#whats-new-messages-toolbar .post-media-document-support' ).hide();
					} else {
						$( '#whats-new-messages-toolbar .post-media-document-support' ).show();
					}

					if ( BP_Nouveau.media.messages_media === false ) {
						$( '#whats-new-messages-toolbar .post-media-photo-support' ).hide();
					} else {
						$( '#whats-new-messages-toolbar .post-media-photo-support' ).show();
					}

					if ( BP_Nouveau.video.messages_video === false ) {
						$( '#whats-new-messages-toolbar .post-media-video-support' ).hide();
					} else {
						$( '#whats-new-messages-toolbar .post-media-video-support' ).show();
					}

					// Membership GiF Support.
					if ( BP_Nouveau.media.gif.messages === false ) {
						$( '#whats-new-messages-toolbar .post-media-gif-support' ).hide();
					} else {
						$( '#whats-new-messages-toolbar .post-media-gif-support' ).show();
					}

					// Membership Emoji Support.
					if ( BP_Nouveau.media.emoji.messages === false ) {
						$( '#whats-new-formatting-toolbar .post-media-emoji-support' ).hide();
					} else {
						$( '#whats-new-formatting-toolbar .post-media-emoji-support' ).show();
					}
				}

				$( 'body' ).removeClass( 'view' ).removeClass( 'inbox' ).addClass( 'compose' );
				$( '.bp-messages-nav-panel.loading' ).removeClass( 'loading' );
			},

			viewMessage: function( thread_id ) {
				if ( ! thread_id ) {
					return;
				}

				// Reset the variable when viewing the thread message using route.
				bp.Nouveau.Messages.divider = [];
				bp.Nouveau.Messages.previous = '';

				// Try to get the corresponding thread.
				var thread = bp.Nouveau.Messages.threads.get( thread_id );

				if ( undefined === thread ) {
					thread    = {};
					thread.id = thread_id;
				}

				bp.Nouveau.Messages.singleView( thread );

				// set current thread id.
				$( '#thread-id' ).val( thread_id );

				$.each(
					$( '.thread-content' ),
					function() {
						var _this = $( this );
						if ( _this.data( 'thread-id' ) == thread_id ) {
							_this.closest( '.thread-item' ).addClass( 'current' );
							if ( _this.closest( '.thread-item' ).hasClass( 'unread' ) ) {
								_this.closest( '.thread-item' ).removeClass( 'unread' );
							}
						} else {
							_this.closest( '.thread-item' ).removeClass( 'current' );
						}
					}
				);

				$( 'body' ).removeClass( 'compose' ).removeClass( 'inbox' ).addClass( 'view' );
			},

			starredView: function() {
				bp.Nouveau.Messages.box = 'starred';
				bp.Nouveau.Messages.threadsView();
			},

			inboxView: function() {
				bp.Nouveau.Messages.box = 'inbox';
				bp.Nouveau.Messages.threadsView();

				$( 'body' ).removeClass( 'view' ).removeClass( 'compose' ).addClass( 'inbox' );
			},

			viewNoArchivedThread: function() {
				bp.Nouveau.Messages.threadType = 'archived';
				bp.Nouveau.Messages.threadsView();

				bp.Nouveau.Messages.singleNoArchivedThreadView();

				//$( '#bp-message-thread-list' ).html( '<li></li>' );
			},

			viewArchivedMessage: function( thread_id ) {
				if ( ! thread_id ) {
					return;
				}

				// Reset the variable when viewing the thread message using route.
				bp.Nouveau.Messages.divider    = [];
				bp.Nouveau.Messages.previous   = '';
				bp.Nouveau.Messages.threadType = 'archived';

				// Try to get the corresponding thread.
				var thread = bp.Nouveau.Messages.threads.get( thread_id );

				if ( undefined === thread ) {
					thread    = {};
					thread.id = thread_id;
				}

				bp.Nouveau.Messages.singleView( thread );

				// set current thread id.
				$( '#thread-id' ).val( thread_id );

				$.each(
					$( '.thread-content' ),
					function() {
						var _this = $( this );
						if ( _this.data( 'thread-id' ) == thread_id ) {
							_this.closest( '.thread-item' ).addClass( 'current' );
							if ( _this.closest( '.thread-item' ).hasClass( 'unread' ) ) {
								_this.closest( '.thread-item' ).removeClass( 'unread' );
							}
						} else {
							_this.closest( '.thread-item' ).removeClass( 'current' );
						}
					}
				);

				$( 'body' ).removeClass( 'compose' ).removeClass( 'inbox' ).addClass( 'view' );
			},
		}
	);

	// Launch BP Nouveau Groups.
	bp.Nouveau.Messages.start();

} )( bp, jQuery );
