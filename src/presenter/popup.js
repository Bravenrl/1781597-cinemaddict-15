import PopupView from '../view/popup.js';
import {
  isEscEvent,
  getTodayDate,
  isSubmitEvent
} from '../utils/movie.js';
import {
  showPopup,
  hidePopup,
  replace,
  remove
} from '../utils/render.js';
import {
  Mode,
  UpdateType,
  UserAction,
  END_POINT,
  AUTHORIZATION
} from '../const.js';
import { nanoid } from 'nanoid';
import Api from '../api.js';

export default class Popup {
  constructor(popupContainer, changeData, commentsModel) {
    this._popupContainer = popupContainer;
    this._changeData = changeData;
    this._mode = Mode.DEFAULT;
    this._commentsModel = commentsModel;
    this._popupComponent = null;
    this._api = new Api(END_POINT, AUTHORIZATION);
    this._isLoaded = false;

    this._escKeydownHendler = this._escKeydownHendler.bind(this);
    this._submitKeydownHendler = this._submitKeydownHendler.bind(this);
    this._handlePopupCloseButtonClick = this._handlePopupCloseButtonClick.bind(this);
    this._handleAddToWatchlistClick = this._handleAddToWatchlistClick.bind(this);
    this._handleAddToFavoritesClick = this._handleAddToFavoritesClick.bind(this);
    this._handleAlreadyWatchedClick = this._handleAlreadyWatchedClick.bind(this);
    this._hadleDeleteCommentClick = this._hadleDeleteCommentClick.bind(this);

    this._movieComments = null;
  }

  _getComments() {
    if ((this._commentsModel.getComments() === null))  {
      this._movieComments = [];
      this._api.getComments(this._movie.id)
        .then((data) => {
          this._isLoaded = true;
          this._commentsModel.setComments(UpdateType.INIT_POPUP, data, this._movie);
        })
        .catch(() => {
          this._isLoaded = false;
          this._commentsModel.setComments(UpdateType.INIT_POPUP, []);
        });
      return;
    }

    this._movieComments = this._commentsModel.getComments();
  }

  initPopup(movie) {
    this._movie = movie;
    this._getComments();
    const prevPopupComponent = this._popupComponent;
    this._popupComponent = new PopupView(this._movie, this._movieComments, this._isLoaded);
    this._popupComponent.setCloseButtonClickHandler(this._handlePopupCloseButtonClick);
    this._popupComponent.setAddToWatchlistClickHandler(this._handleAddToWatchlistClick);
    this._popupComponent.setAddToFavoritesHandler(this._handleAddToFavoritesClick);
    this._popupComponent.setAlreadyWatchedHandler(this._handleAlreadyWatchedClick);
    this._popupComponent.setCommentDeleteClickHandler(this._hadleDeleteCommentClick);
    if (this._mode === Mode.SHOW) {
      replace(this._popupComponent, prevPopupComponent);
      document.body.classList.add('hide-overflow');
      if (prevPopupComponent) {
        const data = prevPopupComponent.getData();
        this._popupComponent.restore(data);
      }
    }
    if (prevPopupComponent !== null) {
      remove(prevPopupComponent);
    }
  }

  destroy() {
    if (this._popupComponent !== null) {
      remove(this._popupComponent);
    }
  }

  resetPopup(movie) {
    if (this._mode !== Mode.DEFAULT) {
      const movieComments = this._commentsModel.getComments();
      this._popupComponent.reset(movie, movieComments);
    }
  }

  hidePopup() {
    if (this._mode !== Mode.DEFAULT) {
      hidePopup(this._popupContainer, this._popupComponent);
      document.removeEventListener('keydown', this._escKeydownHendler);
      document.removeEventListener('keydown', this._submitKeydownHendler);
      this._mode = Mode.DEFAULT;
      this._commentsModel.removeComments();
    }
  }

  showNewPopup(movie) {
    this.initPopup(movie);
    this._mode = Mode.SHOW;
    showPopup(this._popupContainer, this._popupComponent);
    document.addEventListener('keydown', this._escKeydownHendler);
    document.addEventListener('keydown', this._submitKeydownHendler);
  }

  _handlePopupCloseButtonClick() {
    this._popupComponent.reset(this._movie, this._movieComments);
    this.hidePopup();
    this._popupComponent = null;
  }

  _handleAddToWatchlistClick() {
    const updatedMovie = JSON.parse(JSON.stringify(this._movie));
    updatedMovie.userDetails.watchlist = !this._movie.userDetails.watchlist;
    this._changeData(UserAction.UPDATE_MOVIE, UpdateType.MINOR_POPUP, updatedMovie, '', this._cardTitle);
  }

  _handleAddToFavoritesClick() {
    const updatedMovie = JSON.parse(JSON.stringify(this._movie));
    updatedMovie.userDetails.favorite = !this._movie.userDetails.favorite;
    this._changeData(UserAction.UPDATE_MOVIE, UpdateType.MINOR_POPUP, updatedMovie, '', this._cardTitle);
  }

  _handleAlreadyWatchedClick() {
    const updatedMovie = JSON.parse(JSON.stringify(this._movie));
    updatedMovie.userDetails.alreadyWatched = !this._movie.userDetails.alreadyWatched;
    updatedMovie.userDetails.watchingDate = (updatedMovie.userDetails.alreadyWatched) ? getTodayDate() : null;
    this._changeData(UserAction.UPDATE_MOVIE, UpdateType.MINOR_POPUP, updatedMovie, '', this._cardTitle);
  }

  _hadleDeleteCommentClick(updateId) {
    const updatedComment = (this._movieComments).find((comment) => comment.id === `${updateId}`);
    const updatedMovie = this._movie.comments.filter((comment) => comment !== updateId);
    this._movie.comments = updatedMovie;
    this._changeData(
      UserAction.DELETE_COMMENT,
      UpdateType.PATCH_POPUP,
      this._movie,
      updatedComment,
    );
  }

  _escKeydownHendler(evt) {
    if (isEscEvent(evt)) {
      evt.preventDefault();
      this._popupComponent.reset(this._movie, this._movieComments);
      this.hidePopup();
      this._popupComponent = null;
    }
  }

  _submitKeydownHendler(evt) {
    if (isSubmitEvent(evt)) {
      evt.preventDefault();
      const localComment = this._popupComponent.getLocalComment();
      if ((localComment.comment === '') || (localComment.emotion ==='')) {
        return;
      }
      delete localComment.isEmoji;
      const commentId = nanoid();
      this._movie.comments.unshift(commentId);
      this._changeData(
        UserAction.ADD_COMMENT,
        UpdateType.PATCH_POPUP,
        this._movie,
        Object.assign({},
          localComment,
          {id: commentId,
            date: getTodayDate(),
          },
        ),
      );
      this._popupComponent.reset(this._movie, this._movieComments);
    }
  }
}
