


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

