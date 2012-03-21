from google.appengine.api import users
from google.appengine.ext import db


class UserProfileModel(db.Model):
  user     = db.UserProperty()
  email    = db.StringProperty()
  name = db.StringProperty()
  picture = db.StringProperty()



  # *** Class methods ***

  @classmethod
  def getCurrent(self):

    userprofile = UserProfileModel.all().filter('user = ',
        users.get_current_user()).get()

    return userprofile

  # *** End class methods ***

class CvProfileModel(db.Model):
  textcv = db.TextProperty()
  profile       = db.ReferenceProperty(UserProfileModel,
      collection_name = 'cv')
  @classmethod
  def getCv(self):  
    cv =CvProfileModel.all().filter('profile =', UserProfileModel.getCurrent()).get()
    return cv                 